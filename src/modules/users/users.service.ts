import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import databaseConfig from '../../config/database.config';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @Inject(databaseConfig.KEY)
    private dbConfig: ConfigType<typeof databaseConfig>,
  ) {}

  onModuleInit() {
    console.log('user module has been mounted');

    console.log('db port:', this.dbConfig.port);
  }
}
