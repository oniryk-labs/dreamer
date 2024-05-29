import type { BaseModel } from '@adonisjs/lucid/orm';

export type Constructor = { new (...args: any[]): {} };

export class UseModelDecorated<T extends typeof BaseModel> {
  declare $model: T;
}

export function useModel<M extends typeof BaseModel>(m: M) {
  return function <T extends Constructor>(ctor: T) {
    return class extends ctor {
      $model = m;

      constructor(...args: any[]) {
        super(...args);
      }
    };
  };
}
