import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './products.entity';
import { GetProductFilterDto } from './get-product-filter.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async getTopExpensiveProducts(dto: GetProductFilterDto): Promise<Product[]> {
    const { minPrice, limit } = dto;

    return this.productsRepository
      .createQueryBuilder('product')

      .where('product.price >= :minPrice', { minPrice })

      .orderBy('product.price', 'DESC')

      .take(limit)
      .getMany();
  }
}
