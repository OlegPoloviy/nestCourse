import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrdersEntity } from './orders.entity';
import { Repository, DataSource, DeepPartial } from 'typeorm'; // Додай DeepPartial
import { OrderItemEntity } from './order-item.entity';
import { Product } from '../products/products.entity';
import { UserEntity } from '../user/user.entity';
import { CreateOrderDto } from './create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(OrdersEntity)
    private readonly ordersRepository: Repository<OrdersEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemsRepository: Repository<OrderItemEntity>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async createOrder(data: CreateOrderDto): Promise<OrdersEntity> {
    const existing = await this.ordersRepository.findOne({
      where: { idempotencyKey: data.idempotencyKey },
      relations: ['items'],
    });

    if (existing) {
      return existing;
    }

    const user = await this.usersRepository.findOne({
      where: { id: data.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const productIds = [
      ...new Set(data.items.map((item) => item.productId)),
    ].sort();

    try {
      return await this.dataSource.transaction(async (manager) => {
        const productsRepo = manager.getRepository(Product);
        const orderItemsRepo = manager.getRepository(OrderItemEntity);
        const orderRepo = manager.getRepository(OrdersEntity);

        const locked = await productsRepo
          .createQueryBuilder('product')
          .where('product.id IN (:...ids)', { ids: productIds })
          .setLock('pessimistic_write')
          .getMany();

        if (locked.length !== productIds.length) {
          throw new BadRequestException('One or more products not found');
        }

        const productsMap = new Map(locked.map((p) => [p.id, p]));

        const itemsToSave: DeepPartial<OrderItemEntity>[] = [];

        for (const item of data.items) {
          const product = productsMap.get(item.productId);

          if (product.stock < item.quantity) {
            throw new ConflictException(
              `Insufficient stock for product ${product.name}`,
            );
          }

          product.stock -= item.quantity;

          itemsToSave.push({
            product: product,
            quantity: item.quantity,
            priceAtPurchase: String(product.price),
          });
        }

        await productsRepo.save([...productsMap.values()]);

        const order = orderRepo.create({
          userId: data.userId,
          idempotencyKey: data.idempotencyKey,
        });

        const savedOrder = await orderRepo.save(order);

        const orderItems = orderItemsRepo.create(
          itemsToSave.map((i) => ({
            ...i,
            order: savedOrder,
          })),
        );

        await orderItemsRepo.save(orderItems);

        return savedOrder;
      });
    } catch (err) {
      if (err.code === '23505' && err.detail?.includes('idempotencyKey')) {
        return await this.ordersRepository.findOne({
          where: { idempotencyKey: data.idempotencyKey },
          relations: ['items'],
        });
      }
      throw err;
    }
  }

  async getOrderById(id: string): Promise<OrdersEntity> {
    try {
      const order = await this.ordersRepository.findOne({
        where: { id },
        relations: ['items', 'items.product', 'user'],
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      return order;
    } catch (err) {
      throw new InternalServerErrorException('Failed to retrieve order');
    }
  }
}
