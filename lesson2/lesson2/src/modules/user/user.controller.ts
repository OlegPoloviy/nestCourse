import {
  Controller,
  Param,
  Get,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { validate } from 'class-validator';
import { CustomBody } from '../../decorators/body.decorator';
import { TestGuard } from '../../guards/test.guard';

function CustomMethodDecorator() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const paramTypes = Reflect.getMetadata(
        'design:paramtypes',
        target,
        propertyKey,
      );

      // Валідуємо кожен параметр
      if (paramTypes) {
        for (let i = 0; i < paramTypes.length; i++) {
          const ParamClass = paramTypes[i];
          const arg = args[i];

          if (
            ParamClass &&
            typeof ParamClass === 'function' &&
            ParamClass !== String &&
            ParamClass !== Number &&
            ParamClass !== Boolean
          ) {
            // Створюємо екземпляр DTO
            const dtoInstance = Object.assign(new ParamClass(), arg);

            // Валідуємо
            const errors = await validate(dtoInstance);

            if (errors.length > 0) {
              // Краще повертати детальні помилки
              throw new Error(
                `Validation failed: ${errors
                  .map((e) => Object.values(e.constraints || {}))
                  .flat()
                  .join(', ')}`,
              );
            }
          }
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(TestGuard)
  @Get('/:limit')
  getAll(@Param('limit') limit: number) {
    return this.userService.getAll(limit);
  }

  // @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @Post()
  createUser(@Body() body: CreateUserDto) {
    return this.userService.addUser(body);
  }
}
