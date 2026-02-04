import { type  Method, METADATA_TYPES } from '../constants';

export function Route(method: Method, path = '') {
  return function(target: any, key: string) {
    const routes = Reflect.getMetadata(METADATA_TYPES.ROUTES, target.constructor) ?? [];
    routes.push({ method, path, handlerName: key });
    Reflect.defineMetadata(METADATA_TYPES.ROUTES, routes, target.constructor);
  };
}

export const Get = (path?: string) => Route('get', path);
export const Post = (path?: string) => Route('post', path);
export const Put = (path?: string) => Route('put', path);
export const Delete = (path?: string) => Route('delete', path);