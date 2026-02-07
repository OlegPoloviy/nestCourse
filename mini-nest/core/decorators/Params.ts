import {METADATA_TYPES} from "../constants";
import {RouteParamMetadata} from "../types";

export function Param(data?: string, ...pipes: any[]) {
    return function(target: any, propertyKey: string, parameterIndex: number) {
        const ps = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
        const metatype = ps[parameterIndex];
        const params: any[] =
            Reflect.getMetadata(METADATA_TYPES.PARAMS, target.constructor) ?? [];
        params.push({ index: parameterIndex, metatype, type: 'param', data, propertyKey, pipes });
        Reflect.defineMetadata(METADATA_TYPES.PARAMS, params, target.constructor);
    };
}

export function Body(data?: string, ...pipes: any[]) {
    return function (target: any, propertyKey: string, parameterIndex: number) {
        const ps = Reflect.getMetadata('design:paramtypes', target, propertyKey) ?? [];
        const metatype = ps[parameterIndex];

        const params: RouteParamMetadata[] =
            Reflect.getMetadata(METADATA_TYPES.PARAMS, target.constructor) ?? [];

        params.push({ index: parameterIndex, type: 'body', metatype, data, propertyKey, pipes });
        Reflect.defineMetadata(METADATA_TYPES.PARAMS, params, target.constructor);
    };
}

export function Query(data?: string, ...pipes: any[]) {
    return function (target: any, propertyKey: string, parameterIndex: number) {
        const ps = Reflect.getMetadata('design:paramtypes', target, propertyKey) ?? [];
        const metatype = ps[parameterIndex];
        const params:  any[] =
            Reflect.getMetadata(METADATA_TYPES.PARAMS, target.constructor) ?? [];
        params.push({ index: parameterIndex, type: 'query', metatype, data, propertyKey, pipes });
        Reflect.defineMetadata(METADATA_TYPES.PARAMS, params, target.constructor);
    };
}

