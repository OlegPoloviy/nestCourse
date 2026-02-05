import { Module } from '@nestjs/common';
import { UserControllerV1 } from './v1/user.controller.v1';
import { UserService } from './user.service';
import { UserControllerV2 } from './v2/user.controller.v2';

@Module({
  controllers: [UserControllerV1, UserControllerV2],
  providers: [UserService],
})
export class UserModule {}
