import { HttpContext } from '@adonisjs/core/http';
import { PipeTerminateFunction } from '../../decorators/pipe.js';

export default class CrudCreateUseCase {
  static async call(ctx: HttpContext, terminate: PipeTerminateFunction) {
    ctx.pipeContext = ctx.pipeContext || [];
    ctx.pipeContext.push('create');
    terminate();
  }
}
