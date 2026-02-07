export interface RouteParamMetadata {
    index: number;
    type: 'body' | 'query' | 'param';
    data?: string;
    propertyKey: string;
    metatype?: any;
    pipes?: any[];
}