# NestJS app

This project is template for scalable NestJS application, initialized with **Node.js v24 (LTS)**. It uses modular structure with modules, services and controllers created by a **nest cli**.

## Project Structure

The project follows a modular architecture to separate configuration logic from business logic.

```text
src/
├── config/                  # Configuration layer
│   ├── app.config.ts        # Application namespace (port, environment)
│   ├── database.config.ts   # Database namespace (host, credentials)
│   └── env.validation.ts    # Joi validation schema for .env
├── modules/                 # Feature modules (Domain layer)
│   └── users/               # Example user feature module
├── app.module.ts            # Root module
└── main.ts                  # Entry point
```

In the project you can see configuration layer separated from general business logic and cotrollers, it's in order to have possibility in app scaling, making it so much easier to change / add / remove some enviroment variables.

Also the modular structure that you see in all Nest js apps is used to encapsulate business logic into cohesive blocks. This ensures Separation of Concerns, making the application easier to test, maintain, and expand without tightly coupling different parts of the system.

## Packages used

### Joi

Used for envs validation - if some envs are missing or types are unexpected (like string for **DB_PORT**) we will get an error.
Nest config - used for the env mapping and config registration