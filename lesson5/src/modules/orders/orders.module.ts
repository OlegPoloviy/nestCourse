import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemEntity } from './order-item.entity';
import { Product } from '../products/products.entity';
import { UserEntity } from '../user/user.entity';
import { OrdersEntity } from './orders.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderItemEntity,
      OrdersEntity,
      Product,
      UserEntity,
    ]),
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
