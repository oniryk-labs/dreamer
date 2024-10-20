import app from '@adonisjs/core/services/app'
import { HttpContext } from '@adonisjs/core/http'
import { BaseModel } from '@adonisjs/lucid/orm'
import { VineValidator } from '@vinejs/vine'
import type { Infer, SchemaTypes } from '@vinejs/vine/types'

import { success, error } from './http.js'
import { OutputFormatFn } from './format.js'
import { DreamerConfig } from '../../types.js'
import { pagination } from '../validator/pagination.js'
import { parseModelSeachableFields, Scopes, SearchableModel } from './lucid.js'
import { ExtractScopes } from '@adonisjs/lucid/types/model'

export type GenericMetadata = Record<string, any> | undefined

export type ShowOptions<M extends typeof BaseModel> = {
  key?: string
  mutate?: (row: InstanceType<M>) => any
}

export type StoreOptions<M extends typeof BaseModel, Payload> = {
  mutate?: (row: InstanceType<M>, payload: Payload) => Promise<void> | void
}

export type UpdateOptions<M extends typeof BaseModel, Payload> = {
  key?: string
  mutate?: (row: InstanceType<M>, payload: Payload) => Promise<void> | void
}

const getIdKey = (key?: string) => {
  const config = app.config.get<DreamerConfig>('dreamer')
  return key || config.useUUID ? 'uuid' : 'id'
}

export function index<
  Model extends SearchableModel,
  Schema extends SchemaTypes,
  MetaData extends GenericMetadata,
>(
  model: Model,
  options?: {
    validator?: VineValidator<Schema, MetaData>
    perPage?: number
    formats?: OutputFormatFn<Model>[]
    scopes?: Scopes<Model> | ((scopes: ExtractScopes<Model>) => void)
  }
) {
  return async (ctx: HttpContext) => {
    const { request, response } = ctx

    try {
      const { validator = pagination, perPage = 10 } = options || {}
      const { page = 1, ...params } = validator ? await request.validateUsing(validator as any) : {}
      const baseQuery = model.query()
      const searchableFields = parseModelSeachableFields(model)

      for (const key in params) {
        const operator = searchableFields[key] || 'equals'

        if (operator === 'equals') {
          baseQuery.where(key, params[key])
        } else if (operator === 'like') {
          baseQuery.where(key, 'LIKE', `%${params[key]}%`)
        }
      }

      if (options?.scopes) {
        if (typeof options.scopes === 'function') {
          baseQuery.withScopes(options.scopes)
        }

        if (typeof options.scopes === 'string') {
          baseQuery.withScopes((q: ExtractScopes<Model>) => {
            q[options.scopes]()
          })
        }
      }

      if (options?.formats) {
        const { format, f } = ctx.request.qs()
        const reqFormat = f || format

        if (reqFormat) {
          const formatFn = options.formats.find((c) => c.formatName === reqFormat)

          if (formatFn) {
            const rows = await baseQuery
            return formatFn(ctx, rows)
          }
        }
      }

      const rows = await baseQuery.paginate(page, perPage)

      return success(response, rows)
    } catch (err) {
      return error(response, err)
    }
  }
}

export function show<Model extends typeof BaseModel>(model: Model, options?: ShowOptions<Model>) {
  return async ({ params, response }: HttpContext) => {
    try {
      const row = await model.query().where(getIdKey(options?.key), params.id).firstOrFail()

      if (options?.mutate) {
        return success(response, options.mutate(row))
      }

      return success(response, row.toJSON())
    } catch (err) {
      return error(response, err)
    }
  }
}

export function store<
  Model extends typeof BaseModel,
  Schema extends SchemaTypes,
  MetaData extends GenericMetadata,
>(
  model: Model,
  validator: VineValidator<Schema, MetaData>,
  options?: StoreOptions<Model, Infer<Schema>>
) {
  return async ({ request, response }: HttpContext) => {
    try {
      const data = await request.validateUsing(validator as any)
      const row = new model()

      if (options?.mutate) {
        await options.mutate(row as any, data as Infer<typeof validator>)
      } else {
        row.fill(data)
      }

      await row.save()
      return success(response, row.toJSON(), 201)
    } catch (err) {
      return error(response, err)
    }
  }
}

export function update<
  Model extends typeof BaseModel,
  Schema extends SchemaTypes,
  MetaData extends GenericMetadata,
>(
  model: Model,
  validator: VineValidator<Schema, MetaData>,
  options?: UpdateOptions<Model, Infer<Schema>>
) {
  return async ({ request, response, params }: HttpContext) => {
    try {
      const data = await request.validateUsing(validator as any)
      const row = await model.query().where(getIdKey(options?.key), params.id).firstOrFail()

      if (options?.mutate) {
        await options.mutate(row, data as Infer<typeof validator>)
      } else {
        row.merge(data)
      }

      await row.save()
      return success(response, row.toJSON(), 201)
    } catch (err) {
      return error(response, err)
    }
  }
}

export function destroy<Model extends typeof BaseModel>(model: Model) {
  return async ({ params, response }: HttpContext) => {
    try {
      const row = await model.query().where(getIdKey(), params.id).firstOrFail()
      await row.delete()

      return success(response)
    } catch (err) {
      return error(response, err)
    }
  }
}

export type CrudVerb = typeof index | typeof show | typeof store | typeof update | typeof destroy
