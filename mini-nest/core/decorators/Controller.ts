import { markAsInjectable } from '../utils';
import { METADATA_TYPES } from '../constants';

export function Controller(prefix = '') {
  return function(target: any) {
    Reflect.defineMetadata(METADATA_TYPES.CONTROLLER_PREFIX, prefix, target);
    markAsInjectable(target);
  };

}