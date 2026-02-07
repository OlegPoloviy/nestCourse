import { METADATA_TYPES } from './constants';

class Container {
  private instances = new Map<any, any>();
  private providers = new Map<any, any>();

  public register(token: any, provider: any) {
    this.providers.set(token, provider);
  }

  resolve<T>(token: any): T {
    if (this.instances.has(token)) {
      return this.instances.get(token);
    }

    let target = this.providers.get(token);

    if (!target) {
        if (typeof token === 'function') {
             target = token;
        } else {
             throw new Error(`No provider found for token: ${String(token)}`);
        }
    }
    // (Simple check: if it's not a function, we treat it as a value)
    if (typeof target !== 'function') {
        this.instances.set(token, target); // Cache the value
        return target;
    }

    const isInjectable = Reflect.getMetadata(METADATA_TYPES.INJECTABLE, target);
    if (!isInjectable) {
       throw new Error(`Target ${target.name} is not @Injectable`);
    }

    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
    const injectMetadata = Reflect.getMetadata(METADATA_TYPES.INJECT, target) || []; 
    
    const resolvedArgs = paramTypes.map((paramType: any, index: number) => {
      const explicitInjection = injectMetadata.find((meta: any) => meta.index === index);
      const tokenToResolve = explicitInjection ? explicitInjection.token : paramType;
      
      return this.resolve(tokenToResolve); 
    });

    const instance = new target(...resolvedArgs);
    this.instances.set(token, instance);

    return instance;
  }
}

export const container = new Container();