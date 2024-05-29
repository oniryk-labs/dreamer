import { HttpContext } from '@adonisjs/core/http';
import { UseCase } from '../contracts/use_case.js';
import { PipeFunction } from '../contracts/pipe_contexts.js';

const execute = async (fn: Function, scope: unknown, args: any[]) => {
  if (fn.apply && typeof fn.apply === 'function') {
    await fn.apply(scope, args);
  } else {
    await fn(args);
  }
};

export default function pipe(...items: (PipeFunction | UseCase)[]) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (ctx: HttpContext) {
      ctx.pipe = ctx.pipe || {
        context: {},
        interrupt: () => {
          ctx.pipe!.context.interrupted = true;
        },
      };

      for (const item of items) {
        if ((item as UseCase).exec && typeof (item as UseCase).exec === 'function') {
          await execute((item as UseCase).exec, this, [ctx]);
        } else {
          await execute(item as PipeFunction, this, [ctx]);
        }

        if (ctx.pipe?.context?.interrupted) {
          return;
        }
      }

      await originalMethod.apply(this, [ctx]);
    };

    return descriptor;
  };
}

export const chain = pipe;
