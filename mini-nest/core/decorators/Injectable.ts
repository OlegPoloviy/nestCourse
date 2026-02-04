import { METADATA_TYPES } from '../constants';

export function Injectable() {
  return function(target: any) {
    Reflect.defineMetadata(METADATA_TYPES.INJECTABLE, true, target);
  };
}