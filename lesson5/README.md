*Graphql homework*

Graphql is an "update" for a classic REST architecture to deal with overfetching and underfetching. With the help of resolvers and shemas we can build a backend application when client can ask only for required fields.

I chose the Code-First approach for schema generation. NestJS provides excellent support for this via TypeScript decorators (such as @ObjectType(), @InputType(), and @Resolver()). This approach is highly efficient for TypeORM-based projects, as it allows us to use TypeScript classes
