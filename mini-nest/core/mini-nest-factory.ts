import express from 'express';
import { container } from './container';
import { METADATA_TYPES } from './constants';

export function MiniNestFactory(controllers: any[]) {
  const app = express();
  app.use(express.json());

  return {
    listen: (port: number, callback?: () => void) => {
      for (const Ctl of controllers) {

        const instance: any = container.resolve(Ctl);
        const prefix = Reflect.getMetadata(METADATA_TYPES.CONTROLLER_PREFIX, Ctl) ?? '';

        const routes = Reflect.getMetadata(METADATA_TYPES.ROUTES, Ctl);

        if (!routes) continue;

        for (const route of routes) {
          const path = `/${prefix}/${route.path}`.replace(/\/+/g, '/');


          const handler = instance[route.handlerName];
          const boundHandler = handler.bind(instance);

          const wrapper = async (req: any, res: any, next: any) => {
            try {
              const result = await boundHandler(req, res, next);

              if (result !== undefined && !res.headersSent) {
                res.json(result);
              }
            } catch (error) {
              next(error);
            }
          };
          (app as any)[route.method](path, wrapper);
        }
      }

      app.listen(port, callback);
    },
  };
}