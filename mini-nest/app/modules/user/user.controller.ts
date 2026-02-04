import { Controller } from '../../../core/decorators/Controller';
import { Get } from '../../../core/decorators/Route';
import { UserService } from './user.service';

@Controller('/users')
export class UserController {
  constructor(private userService: UserService) {
  }

  @Get('/')
  getAllUsers() {
    return this.userService.findAll();
  }
}