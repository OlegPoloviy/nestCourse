import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderStatus } from '../../constants';
import { OrderItemEntity } from './order-item.entity';

@Entity('order')
export class OrdersEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @OneToMany(() => OrderItemEntity, (item) => item.order)
  items: OrderItemEntity[];

  @Column({
    type: 'enum',
    enum: OrderStatus,
    enumName: 'orders_status_enum',
    default: OrderStatus.CREATED,
  })
  status: OrderStatus;

  @Column({ type: 'uuid', unique: true })
  idempotencyKey: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
