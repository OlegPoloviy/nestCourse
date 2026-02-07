import express from 'express';
import { container } from './container';
import { METADATA_TYPES } from './constants';
import { RouteParamMetadata } from './types';
import { ForbiddenException, HTTPException } from './errors';

export function MiniNestFactory(AppModule: any) {
  const app = express();
  app.use(express.json());

  const globalPipes: any[] = [];
  const globalGuards: any[] = [];
  
  const controllers = new Set<any>();
  const scannedModules = new Set<any>();

  const scanModule = (ModuleClass: any) => {
    if (scannedModules.has(ModuleClass)) return;
    scannedModules.add(ModuleClass);

    const meta = Reflect.getMetadata(METADATA_TYPES.MODULE, ModuleClass);
    if (!meta) return;

    (meta.providers || []).forEach((provider: any) => {
        container.register(provider, provider);
    });
    (meta.controllers || []).forEach((controller: any) => {
        controllers.add(controller);
    });

    (meta.imports || []).forEach((importedModule: any) => {
        scanModule(importedModule);
    });
  };

  scanModule(AppModule);

  const listen = (port: number, callback?: () => void) => {
    for (const Ctl of controllers) {
      const instance: any = container.resolve(Ctl);
      const prefix = Reflect.getMetadata(METADATA_TYPES.CONTROLLER_PREFIX, Ctl) ?? '';
      const routes = Reflect.getMetadata(METADATA_TYPES.ROUTES, Ctl);

      const controllerPipes = Reflect.getMetadata(METADATA_TYPES.PIPES, Ctl) || [];
      const controllerGuards = Reflect.getMetadata(METADATA_TYPES.GUARDS, Ctl) || [];

      if (!routes) continue;

      for (const route of routes) {
        const path = `/${prefix}/${route.path}`.replace(/\/+/g, '/');

        const methodPipes = Reflect.getMetadata(METADATA_TYPES.PIPES, instance[route.handlerName]) || [];
        const methodGuards = Reflect.getMetadata(METADATA_TYPES.GUARDS, instance[route.handlerName]) || [];

        const paramsMeta: RouteParamMetadata[] =
            Reflect.getMetadata(METADATA_TYPES.PARAMS, Ctl) ?? [];

        const methodParams = paramsMeta
            .filter(p => p.propertyKey === route.handlerName)
            .sort((a, b) => a.index - b.index);

        const wrapper = async (req: any, res: any, next: any) => {
          try {
            // 1. Resolve Parameters & Run Pipes
            const args = [];
            
            for (const param of methodParams) {
              let value;
              switch(param.type) {
                case 'body': value = param.data ? req.body?.[param.data] : req.body; break;
                case 'query': value = param.data ? req.query?.[param.data] : req.query; break;
                case 'param': value = param.data ? req.params?.[param.data] : req.params; break;
              }

              // Param-level pipes
              const paramPipes = param.pipes || [];
              
              // Combine all pipes
              const allPipes = [...globalPipes, ...controllerPipes, ...methodPipes, ...paramPipes];

              for (const PipeClass of allPipes) {
                const pipe = container.resolve(PipeClass) as any;
                value = await pipe.transform(value, {
                  metatype: param.metatype,
                  type: param.type,
                  data: param.data
                });
              }

              args[param.index] = value;
            }

            // 2. Run Guards
            const allGuards = [...globalGuards, ...controllerGuards, ...methodGuards];
            
            for (const GuardClass of allGuards) {
              const guard = container.resolve(GuardClass) as any;
              const canActivate = await guard.canActivate({ req });
              if (!canActivate) {
                throw new ForbiddenException();
              }
            }

            const result = await instance[route.handlerName](...args);

            if (!res.headersSent) {
              if (result !== undefined) {
                res.status(200).json(result);
              } else {
                res.status(204).send();
              }
            }

          } catch (error: any) {
            if (error instanceof HTTPException) {
              res.status(error.getStatus()).json(error.getResponse());
            } else {
              console.error(error);
              res.status(500).json({
                statusCode: 500,
                message: 'Internal Server Error'
              });
            }
          }
        };

        (app as any)[route.method](path, wrapper);
      }
    }
    app.listen(port, callback);
  };

  return { 
      listen,
      useGlobalPipes: (...pipes: any[]) => globalPipes.push(...pipes),
      useGlobalGuards: (...guards: any[]) => globalGuards.push(...guards)
  };
}