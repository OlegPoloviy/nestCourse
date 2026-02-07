export interface PipeTransform<T = any, R = any> {
    transform(value: T, metadata: { metatype?: any; type: string }): R;
}

export interface CanActivate {
    canActivate(context: { req: any }): boolean | Promise<boolean>;
}