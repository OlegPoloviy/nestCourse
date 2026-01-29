import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  private users: any[] = [
    {
      email: 'admin@admin.com',
      password: 'admin',
      roles: ['admin'],
    },
    {
      email: 'user@email.com',
      password: 'user',
      roles: ['user'],
    },
  ];

  getAll(limit: number) {
    if (limit >= 0) {
      return this.users.slice(limit);
    }

    const response = { count: this.users.length, users: this.users };
    return response;
  }

  addUser(user: CreateUserDto) {
    this.users.push(user);
  }
}
