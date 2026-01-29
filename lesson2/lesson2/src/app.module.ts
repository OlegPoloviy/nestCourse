import {
  Module,
  MiddlewareConsumer,
  NestModule,
  OnModuleInit,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';

function CustomDecorator() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const start = Date.now();

    descriptor.value = function (...args: any[]) {
      console.log('called ', propertyKey, originalMethod, ...args);

      const result = originalMethod.apply(this, args);

      const end = Date.now();
      console.log(`Done for ${end - start}ms`);

      return result;
    };
    return descriptor;
  };
}

@Module({
  imports: [UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  // configure(consumer: MiddlewareConsumer) {
  //   consumer.apply(RequestMiddleware).forRoutes('*');
  // }

  @CustomDecorator()
  onModuleInit(): any {
    console.log('AppModule initialized');
  }
}
