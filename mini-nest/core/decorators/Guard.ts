import {METADATA_TYPES} from "../constants";
import {CanActivate} from "../interfaces";
import {markAsInjectable} from "../utils";

export function UseGuards(...guards: any[]) {
    return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
        if (descriptor) {
            Reflect.defineMetadata(METADATA_TYPES.GUARDS, guards, descriptor.value);
        } else {
            Reflect.defineMetadata(METADATA_TYPES.GUARDS, guards, target);
        }
    };
}

export class SimpleGuard implements CanActivate {
    canActivate(context: { req: any }): boolean | Promise<boolean> {
        const req = context.req
        console.log('Guard: SimpleGuard checking...');
        return !!req.headers['authorization'];
    }
}

markAsInjectable(SimpleGuard);