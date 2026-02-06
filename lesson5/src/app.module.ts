import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { RequestIdMiddleware } from './middlewares/request-id.middleware';
import { DatabaseModule } from './modules/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [
    UserModule,
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    OrdersModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  // configure(consumer: MiddlewareConsumer) {
  //   consumer.apply(RequestMiddleware).forRoutes('*');
  // }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
