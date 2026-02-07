import { METADATA_TYPES } from "../constants";

export function Module(metadata: {controllers: any[]; providers: any[]; imports: any[]}) {
    return function(target: any) {
        Reflect.defineMetadata(METADATA_TYPES.MODULE, metadata, target);
    };
}