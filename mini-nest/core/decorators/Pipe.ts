import {METADATA_TYPES} from "../constants";
import {PipeTransform} from "../interfaces";
import {BadRequestException} from "../errors";
import {markAsInjectable} from "../utils";

export function UsePipes(...pipes: any[]) {
    return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
        if (descriptor) {
            Reflect.defineMetadata(METADATA_TYPES.PIPES, pipes, descriptor.value);
        } else {
            Reflect.defineMetadata(METADATA_TYPES.PIPES, pipes, target);
        }
    };
}

export class ParseIntPipe implements  PipeTransform {
    transform(value: any, metadata: { metatype?: any; type: string }): number {
        const val = parseInt(value, 10);
        if (isNaN(val)) {
            throw new BadRequestException('Validation failed (numeric string is expected)');
        }
        return val;
    }

}

markAsInjectable(ParseIntPipe);


export class LoggingPipe implements PipeTransform {
    transform(value: any, metadata: { metatype?: any; type: string }) {
        console.log('Pipe: LoggingPipe transforming...');
        return value;
    }
}
markAsInjectable(LoggingPipe);
