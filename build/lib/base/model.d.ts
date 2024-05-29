import type { BaseModel } from '@adonisjs/lucid/orm';
export type Constructor = {
    new (...args: any[]): {};
};
export declare function useModel<M extends typeof BaseModel>(m: M): <T extends Constructor>(ctor: T) => {
    new (...args: any[]): {
        $model: M;
    };
} & T;
