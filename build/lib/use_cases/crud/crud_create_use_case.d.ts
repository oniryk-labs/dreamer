import { HttpContext } from '@adonisjs/core/http';
import { PipeTerminateFunction } from '../../decorators/pipe.js';
export default class CrudCreateUseCase {
    static call(ctx: HttpContext, terminate: PipeTerminateFunction): Promise<void>;
}
