**Graphql homework**

Graphql is an "update" for a classic REST architecture to deal with overfetching and underfetching. With the help of resolvers and shemas we can build a backend application when client can ask only for required fields.

I chose the Code-First approach for schema generation. NestJS provides excellent support for this via TypeScript decorators (such as @ObjectType(), @InputType(), and @Resolver()). This approach is highly efficient for TypeORM-based projects, as it allows us to use TypeScript classes

**Resolvers that I've added**
To keep the logic thin and clean , I've  created two resolvers - one for order, and second for order items. Both of them support optimised strategy and simple(Reed in the next section).

**(N+1 issue fix)**
Before Using a data loader, I had a query:
```typescript
  @Query(() => OrdersResponse)
  getOrdersSimple(@Args('ordersFilter', {nullable: true}) filters: OrderFilterInput, @Args('pagination', { nullable: true })pagination: OrderPaginationInput{
    return this.ordersService.getOrders(pagination, filters);
  }
```
In this query, our response will be collected from several tables- User, Product , Order , OrderItem. And with logger the result is:
```
[POST /graphql] SQL queries: 33
```
And here is query that I have run :
```
query {
  getOrdersSimple(pagination: {page: 2,limit: 10}){
    total
    items{
       status
      id
      user {
        email
      }
      items {
        id
        priceAtPurchase
        quantity
        priceAtPurchase
        product{
          id
          name
        }
      }
    }
  }
}
```
But, with the help of data loader(which just does it's thing by collecding all of the id's and making one query instead of that many, and that's exactly the case why it's working) I reduced this number 
```
[POST /graphql] SQL queries: 5
```

**To test everything**

*Pagination*
```
 getOrders(pagination: {page: 2,limit: 10})
```
*Filtering*
```
  getOrders(ordersFilter: {status: PAID, dateTo: "2026-02-06 22:07:24.055"}) 
```
*Simple queries*
```
query {
#   getOrdersSimple(pagination: {page: 2,limit: 10}){
#     total
#     items{
#        status
#       id
#       user {
#         email
#       }
#       items {
#         id
#         priceAtPurchase
#         quantity
#         priceAtPurchase
#         product{
#           id
#           name
#         }
#       }
#     }
#   }
# }
```
