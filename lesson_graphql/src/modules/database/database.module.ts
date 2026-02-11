import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // 1. Витягуємо налаштування у змінну
        const config = {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          autoLoadEntities: true,
          synchronize: false,
        };

        // 2. Виводимо їх у консоль (тільки для дебагу!)
        console.log('--- DB CONNECTION CONFIG ---');
        console.log('Host:', config.host);
        console.log('Database:', config.database);
        console.log('User:', config.username);
        console.log('Password Length:', config.password?.length);
        console.log('----------------------------');

        // 3. Повертаємо конфіг
        return config;
      },
    }),
  ],
})
export class DatabaseModule {}