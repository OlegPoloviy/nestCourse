import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { UserService } from '../user.service';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserV2ResponseDto } from './dto/user.reponse.dto';
import { TestGuard } from '../../../guards/test.guard';
import { UserDtoV2 } from './dto/user.dto.v2';

@ApiTags('User v2')
@Controller({ path: 'user', version: '2' })
export class UserControllerV2 {
  constructor(private readonly userService: UserService) {}

  @UseGuards(TestGuard)
  @ApiOperation({
    summary: 'Create user (v2)',
    description:
      'Preferred input is `profile`. Legacy `name` is accepted for migration (deprecated).',
  })
  @ApiCreatedResponse({ type: UserV2ResponseDto })
  @ApiBearerAuth('access-token')
  @Post()
  async create(@Body() dto: UserDtoV2) {
    return this.userService.addUserV2(dto);
  }
}
