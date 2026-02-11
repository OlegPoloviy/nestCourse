import {Resolver, Query, Args } from "@nestjs/graphql";
import { OrderModel } from './order.model';
import {OrdersResponse} from '../dto/order-response.dto';
import { OrderFilterInput } from '../dto/order-filter.input';
import {OrdersService} from '../orders.service';
import { OrderPaginationInput } from '../dto/order-pagination.input';

@Resolver(() => OrderModel)
export class OrderResolver {

  constructor(private readonly ordersService: OrdersService) {
  }

  @Query(() => OrdersResponse)
  getOrders(@Args('ordersFilter', {nullable: true}) filters: OrderFilterInput, @Args('pagination', { nullable: true }) pagination: OrderPaginationInput){
    return this.ordersService.getOrders(pagination, filters);
  }
}