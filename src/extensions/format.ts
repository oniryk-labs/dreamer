import { HttpContext } from '@adonisjs/core/http'
import { BaseModel } from '@adonisjs/lucid/orm'

export type OutputFormatFn<M extends typeof BaseModel> = {
  (ctx: HttpContext, rows: InstanceType<M>[]): Promise<void> | void
  formatName: string
}
