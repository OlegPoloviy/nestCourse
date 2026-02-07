import { METADATA_TYPES } from '../constants';

export function Inject(token: any) {
  return function(target: any, propertyKey: string, parameterIndex: number) {
    const existingInjections = Reflect.getMetadata(METADATA_TYPES.INJECT, target) || [];
    existingInjections.push({ index: parameterIndex, token });
    Reflect.defineMetadata(METADATA_TYPES.INJECT, existingInjections, target);
  };
}
