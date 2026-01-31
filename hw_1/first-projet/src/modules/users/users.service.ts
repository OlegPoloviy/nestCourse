import { Injectable, Inject, OnModuleInit,NotFoundException } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import databaseConfig from '../../config/database.config';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @Inject(databaseConfig.KEY)
    private dbConfig: ConfigType<typeof databaseConfig>,
  ) {}
  private readonly mockUsers = [
    {
      id: 1,
      email: 'admin@nestjs.com',
      username: 'Oleg Admin',
      role: 'ADMIN',
      isActive: true,
    },
    {
      id: 2,
      email: 'student@nestjs.com',
      username: 'JS Student',
      role: 'USER',
      isActive: true,
    },
    {
      id: 3,
      email: 'blocked@nestjs.com',
      username: 'Bad Guy',
      role: 'USER',
      isActive: false,
    },
  ];

  onModuleInit() {
    console.log('user module has been mounted');

    console.log('db port:', this.dbConfig.port);
  }

  getAll(){
    return this.mockUsers;
  }

  getById(id: number){

    const user = this.mockUsers.find(user => user.id === id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }
}
