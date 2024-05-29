import { HttpContext } from '@adonisjs/core/http';

export type UseCase = {
  exec: (ctx: HttpContext) => Promise<void>;
};
