export class Container {
  private instances = new Map<any, any>();

  resolve<T>(target: any): T {

    if (this.instances.has(target)) {
      return this.instances.get(target);
    }

    const isInjectable = Reflect.getMetadata('injectable', target);
    if (!isInjectable) {
      throw new Error(`Cannot resolve ${target.name} because it is not injectable`);
    }


    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
    console.log('paramTypes', paramTypes);

    const resolvedArgs = paramTypes.map((param: any) => {
      return this.resolve(param);
    });


    const instance = new target(...resolvedArgs);

    this.instances.set(target, instance);

    return instance;
  }
}