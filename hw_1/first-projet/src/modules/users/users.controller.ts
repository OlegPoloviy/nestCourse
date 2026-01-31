import { Controller, Get, Param,ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}


  @Get()
  getAllUsers(){
      return this.usersService.getAll();
  }

  @Get(':id')
  getOne(@Param('id',ParseIntPipe) id: number) {
    return this.usersService.getById(id);
  }
}
