import { DataSource } from 'typeorm';
import 'dotenv/config';
import { UserEntity } from './src/modules/user/user.entity';
import { ProfileEntity } from './src/modules/user/profile.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [UserEntity, ProfileEntity],
  migrations: ['src/migrations/*{.ts,.js}'],
  synchronize: false,
});
