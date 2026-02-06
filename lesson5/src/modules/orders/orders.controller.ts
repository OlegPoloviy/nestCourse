import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './create-order.dto';
import { OrdersEntity } from './orders.entity';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: 201,
    description: 'Order created',
    type: OrdersEntity,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Related entity not found' })
  @ApiResponse({
    status: 409,
    description:
      'Conflict (e.g. insufficient stock or duplicate idempotency key)',
  })
  create(@Body() dto: CreateOrderDto): Promise<OrdersEntity> {
    return this.ordersService.createOrder(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by id' })
  @ApiResponse({ status: 200, description: 'Order found', type: OrdersEntity })
  @ApiResponse({ status: 404, description: 'Order not found' })
  getById(@Param('id', new ParseUUIDPipe()) id: string): Promise<OrdersEntity> {
    return this.ordersService.getOrderById(id);
  }
}
