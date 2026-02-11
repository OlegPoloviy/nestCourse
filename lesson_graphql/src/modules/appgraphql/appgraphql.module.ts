import { Module } from '@nestjs/common';
import {GraphQLModule} from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { OrderResolver} from '../orders/graphql/order.resolver';


@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory : () => ({
        autoSchemaFile: true,
        graphiql: true,
        introspection: true,
      })
    }),
  ],
})
export class AppGraphqlModule {}
