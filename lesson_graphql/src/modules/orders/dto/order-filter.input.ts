import { Field, InputType} from '@nestjs/graphql';
import { IsOptional, IsEnum } from 'class-validator';
import { OrderStatus } from 'src/constants';

@InputType()
export class OrderFilterInput {
  @Field(() => OrderStatus, { nullable: true })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  dateFrom?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  dateTo?: string;
}