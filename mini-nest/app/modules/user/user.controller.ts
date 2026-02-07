import { Controller } from '../../../core/decorators/Controller';
import { Get, Post } from '../../../core/decorators/Route';
import { UserService } from './user.service';
import {Param, Body} from "../../../core/decorators/Params";
import {UsePipes, ParseIntPipe, LoggingPipe} from "../../../core/decorators/Pipe";
import {UseGuards, SimpleGuard} from "../../../core/decorators/Guard";
import {NotFoundException} from "../../../core/errors";


@Controller('/users')
export class UserController {
  constructor(private userService: UserService) {
  }

  @Get('/')
  getAllUsers() {
    return this.userService.findAll();
  }

  @Get('/:id')
  @UsePipes(ParseIntPipe)
  @UseGuards(SimpleGuard)
  getUserById(@Param('id') id: number) {
    const user = this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;  }
  
  @Post('/')
  @UseGuards(SimpleGuard)
  @UsePipes(LoggingPipe) 
  createUser(@Body() body: any) {
    console.log('Controller: Creating user...');
    return this.userService.create(body);
  }
}