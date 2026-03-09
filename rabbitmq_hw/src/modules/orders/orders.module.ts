import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemEntity } from './order-item.entity';
import { Product } from '../products/products.entity';
import { UserEntity } from '../user/user.entity';
import { OrdersEntity } from './orders.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderResolver } from './graphql/order.resolver';
import { UserService } from '../user/user.service';
import { UserModule } from '../user/user.module';
import { OrderItemResolver } from './graphql/order-item.resolver';
import { ProductsModule } from '../products/products.module';
import { OrderTrackingModule } from '../order-tracking/order-tracking.module';

@Module({
  imports: [
    OrderTrackingModule,
    TypeOrmModule.forFeature([
      OrderItemEntity,
      OrdersEntity,
      Product,
      Product,
      UserEntity,
    ]),
    UserModule,
    ProductsModule,
  ],
  providers: [OrdersService, OrderResolver, OrderItemResolver],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
