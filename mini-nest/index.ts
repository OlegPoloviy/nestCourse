import 'reflect-metadata';
import { MiniNestFactory } from './core/mini-nest-factory';
import {UsersModule} from "./app/modules/user/user.module";

async function bootstrap() {
  const app = MiniNestFactory(UsersModule);

  app.listen(3000, () => {
    console.log('Mini-Nest Server started on http://localhost:3000');
    console.log('try: GET http://localhost:3000/users');
  });
}

bootstrap();