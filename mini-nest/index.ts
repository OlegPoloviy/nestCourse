import 'reflect-metadata'; // ОБОВ'ЯЗКОВО найперший імпорт!
import { MiniNestFactory } from './core/mini-nest-factory';
import { UserController } from './app/modules/user/user.controller';

async function bootstrap() {
  // Передаємо масив контролерів (як в модулі NestJS)
  const app = MiniNestFactory([UserController]);

  // У тебе має бути метод listen, який повертає NestFactory
  app.listen(3000, () => {
    console.log('🚀 Mini-Nest Server started on http://localhost:3000');
    console.log('try: GET http://localhost:3000/users');
  });
}

bootstrap();