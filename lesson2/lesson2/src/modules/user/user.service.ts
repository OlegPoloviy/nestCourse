import { Injectable } from '@nestjs/common';
import { CreateUserDtoV1 } from './v1/dto/create-user.dto.v1';
import { UserDtoV2 } from './v2/dto/user.dto.v2';

@Injectable()
export class UserService {
  private users: any[] = [
    {
      id: '1',
      email: 'admin@admin.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  getAll(limit?: number) {
    const data =
      limit !== undefined && limit >= 0
        ? this.users.slice(0, limit)
        : this.users;

    return {
      count: this.users.length,
      data: data,
    };
  }

  addUserV1(dto: CreateUserDtoV1) {
    const newUser: any = {
      id: crypto.randomUUID(),
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    this.users.push(newUser);
    return newUser;
  }

  deleteUser(id: string) {
    const index = this.users.findIndex((user) => user.id === id);
    if (index === -1) {
      return { ok: false, message: 'User not found' };
    }
    this.users.splice(index, 1);
    return { ok: true };
  }

  addUserV2(dto: UserDtoV2) {
    const newUser = {
      email: dto.email,
      profile: dto.profile,
      id: crypto.randomUUID(),
    };

    this.users.push(newUser);
  }
}
