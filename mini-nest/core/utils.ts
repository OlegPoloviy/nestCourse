import { METADATA_TYPES } from './constants';

export function markAsInjectable(target: any) {
  Reflect.defineMetadata(METADATA_TYPES.INJECTABLE, true, target);
}