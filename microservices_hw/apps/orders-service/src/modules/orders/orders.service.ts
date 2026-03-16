import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrdersEntity } from './orders.entity';
import {
  Repository,
  DataSource,
  DeepPartial,
  FindOptionsWhere,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  EntityManager,
} from 'typeorm';
import { OrderItemEntity } from './order-item.entity';
import { Product } from '../products/products.entity';
import { UserEntity } from '../user/user.entity';
import { CreateOrderDto } from './create-order.dto';
import { AuthUser } from '../auth/types/auth.types';
import { OrderStatus } from '../../constants';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { OrdersProcessMessage } from './orders-queue.type';
import { ProcessedMessagesEntity } from './processed-message.entity';

const ORDERS_PROCESS_QUEUE = 'orders.process';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    private dataSource: DataSource,
    private readonly rabbitmqService: RabbitmqService,
    @InjectRepository(OrdersEntity)
    private readonly ordersRepository: Repository<OrdersEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemsRepository: Repository<OrderItemEntity>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(ProcessedMessagesEntity)
    private readonly processedMessagesRepository: Repository<ProcessedMessagesEntity>,
  ) {}

  async createOrder(data: CreateOrderDto): Promise<OrdersEntity> {
    const existing = await this.ordersRepository.findOne({
      where: { idempotencyKey: data.idempotencyKey },
      relations: ['items'],
    });
    if (existing) return existing;

    const savedOrder = await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(OrdersEntity);
      const orderItemsRepo = manager.getRepository(OrderItemEntity);

      const order = orderRepo.create({
        userId: data.userId,
        idempotencyKey: data.idempotencyKey,
        status: OrderStatus.PENDING,
      });
      const saved = await orderRepo.save(order);

      const orderItems = orderItemsRepo.create(
        data.items.map((item) => ({
          order: saved,
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: '0',
        })),
      );
      await orderItemsRepo.save(orderItems);

      return saved;
    });

    const messageId = randomUUID();
    this.rabbitmqService.publish(ORDERS_PROCESS_QUEUE, {
      messageId,
      orderId: savedOrder.id,
      createdAt: savedOrder.createdAt.toISOString(),
      attempt: 0,
      items: data.items,
    });

    return savedOrder;
  }

  async processOrderFromQueue(
    payload: OrdersProcessMessage,
  ): Promise<OrdersEntity> {
    return this.dataSource.transaction((manager) =>
      this.processOrderFromQueueInternal(manager, payload),
    );
  }

  async processOrderFromQueueIdempotent(
    payload: OrdersProcessMessage,
  ): Promise<{ order: OrdersEntity | null; alreadyProcessed: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const processedRepo = manager.getRepository(ProcessedMessagesEntity);

      try {
        await processedRepo.insert({
          messageId: payload.messageId,
          orderId: payload.orderId,
          processedAt: new Date(),
          handler: 'orders.process',
        });
      } catch (error: any) {
        // 23505 - unique_violation in PostgreSQL
        if (error?.code === '23505') {
          this.logger.warn(
            `Message ${payload.messageId} already processed. Skipping...`,
          );

          return { order: null, alreadyProcessed: true };
        }

        throw error;
      }

      const order = await this.processOrderFromQueueInternal(manager, payload);

      return { order, alreadyProcessed: false };
    });
  }

  private async processOrderFromQueueInternal(
    manager: EntityManager,
    payload: OrdersProcessMessage,
  ): Promise<OrdersEntity> {
    this.logger.log(`Processing order from queue: ${payload.orderId}`);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const orderRepo = manager.getRepository(OrdersEntity);
    const productRepo = manager.getRepository(Product);

    const order = await orderRepo.findOne({
      where: { id: payload.orderId },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(`Order ${payload.orderId} not found`);
    }

    if (order.status === OrderStatus.PROCESSED) {
      this.logger.warn(`Order ${order.id} already processed. Skipping...`);
      return order;
    }

    const productIds = order.items.map((item) => item.productId);
    const lockedProducts = await productRepo
      .createQueryBuilder('product')
      .setLock('pessimistic_write')
      .where('product.id IN (:...ids)', { ids: productIds })
      .getMany();

    const productMap = new Map(lockedProducts.map((p) => [p.id, p]));

    for (const item of order.items) {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }

      if (product.stock < item.quantity) {
        throw new ConflictException(`Not enough stock for ${product.name}`);
      }

      product.stock -= item.quantity;

      item.priceAtPurchase = String(product.price);
    }

    await productRepo.save(lockedProducts);
    await manager.getRepository(OrderItemEntity).save(order.items);

    order.status = OrderStatus.PROCESSED;
    order.processedAt = new Date();

    const saved = await orderRepo.save(order);
    this.logger.log(`Order ${saved.id} status changed to PROCESSED`);

    return saved;
  }

  async getOrderById(id: string): Promise<OrdersEntity> {
    const order = await this.ordersRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getOrders(pagination?, filters?): Promise<OrdersEntity[]> {
    const where: FindOptionsWhere<OrdersEntity> = {};

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.dateFrom && filters?.dateTo) {
      where.createdAt = Between(
        new Date(filters.dateFrom),
        new Date(filters.dateTo),
      );
    } else if (filters?.dateFrom) {
      where.createdAt = MoreThanOrEqual(new Date(filters.dateFrom));
    } else if (filters?.dateTo) {
      where.createdAt = LessThanOrEqual(new Date(filters.dateTo));
    }

    const skip = (Math.max(1, page) - 1) * limit;

    const [orders, count] = await this.ordersRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      relations: { items: true },
      take: limit,
      skip,
    });

    return {
      //@ts-ignore
      items: orders,
      total: count,
    };
  }

  async getOrderItems(orderId: string): Promise<OrderItemEntity[]> {
    const orderItems = await this.orderItemsRepository.find({
      where: { orderId },
    });

    return orderItems;
  }

  async canSubscribeToOrder(orderId: string, user: AuthUser): Promise<void> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.assertCanAccessOrder(order, user);
  }

  private assertCanAccessOrder(order: OrdersEntity, user: AuthUser): void {
    if (this.isStaff(user.roles)) {
      return;
    }

    if (order.userId !== user.sub) {
      throw new ForbiddenException('Access denied');
    }
  }

  private isStaff(roles: string[]): boolean {
    return (
      roles.includes('admin') ||
      roles.includes('operator') ||
      roles.includes('support')
    );
  }

  async setOrderCourierId(
    orderId: string,
    courierId: string,
  ): Promise<OrdersEntity> {
    const order = await this.getOrderById(orderId);
    order.courierId = courierId;
    return this.ordersRepository.save(order);
  }

  async isCourierAssignedToOrder(
    orderId: string,
    courierId: string,
  ): Promise<boolean> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      select: ['courierId'],
    });

    return order?.courierId === courierId;
  }
}
