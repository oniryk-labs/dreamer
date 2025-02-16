import { Bouncer } from '@adonisjs/bouncer'
import { HttpContext as HttpContextOriginal } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { BaseModel } from '@adonisjs/lucid/orm'
import { VineValidator } from '@vinejs/vine'
import type { Infer, SchemaTypes } from '@vinejs/vine/types'

import { ExtractScopes, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { DreamerConfig } from '../../types.js'
import { pagination } from '../validator/pagination.js'
import { OutputFormatFn } from './format.js'
import { success } from './http.js'
import { parseModelSeachableFields, Scopes, SearchableModel } from './lucid.js'

export type GenericMetadata = Record<string, any> | undefined

type BoucerAbility = ReturnType<(typeof Bouncer)['ability']>

interface HttpContext extends HttpContextOriginal {
  bouncer: InstanceType<typeof Bouncer<any, any, any>>
}

export type ShowOptions<M extends typeof BaseModel> = {
  key?: string
  mutate?: (row: InstanceType<M>) => any
  ability?: BoucerAbility
}

export type StoreOptions<M extends typeof BaseModel, Payload> = {
  mutate?: (row: InstanceType<M>, payload: Payload) => Promise<void> | void
  ability?: BoucerAbility
  status?: 200 | 201
}

export type UpdateOptions<M extends typeof BaseModel, Payload> = {
  key?: string
  mutate?: (row: InstanceType<M>, payload: Payload) => Promise<void> | void
  ability?: BoucerAbility
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
    scope?: Scopes<Model> | ((scopes: ExtractScopes<Model>) => void)
    ability?: BoucerAbility
    query?: (query: ModelQueryBuilderContract<Model>, ctx: HttpContext) => void
  }
) {
  return async (ctx: HttpContext) => {
    const { request, response, bouncer } = ctx

    if (options?.ability) {
      if (!bouncer) throw new Error('@adonisjs/bouncer is required to use abilities')
      await bouncer.authorize(options.ability)
    }

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

    if (options?.scope) {
      if (typeof options.scope === 'function') {
        baseQuery.withScopes(options.scope)
      }

      if (typeof options.scope === 'string') {
        baseQuery.withScopes((q: ExtractScopes<Model>) => {
          q[options.scope]()
        })
      }
    }

    if (options?.query) {
      options.query(baseQuery, ctx)
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
  }
}

export function show<Model extends typeof BaseModel>(model: Model, options?: ShowOptions<Model>) {
  return async ({ params, response, bouncer }: HttpContext) => {
    const row = await model.query().where(getIdKey(options?.key), params.id).firstOrFail()

    if (options?.ability) {
      if (!bouncer) throw new Error('@adonisjs/bouncer is required to use abilities')
      await bouncer.authorize(options.ability, row)
    }

    if (options?.mutate) {
      return success(response, options.mutate(row))
    }

    return success(response, row.toJSON())
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
  return async ({ request, response, bouncer }: HttpContext) => {
    const data = await request.validateUsing(validator as any)
    const row = new model()

    if (options?.mutate) {
      await options.mutate(row as any, data as Infer<typeof validator>)
    } else {
      row.fill(data)
    }

    if (options?.ability) {
      if (!bouncer) throw new Error('@adonisjs/bouncer is required to use abilities')
      await bouncer.authorize(options.ability, row)
    }

    await row.save()
    return success(response, row.toJSON(), options?.status || 201)
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
  return async ({ request, response, params, bouncer }: HttpContext) => {
    const data = await request.validateUsing(validator as any)
    const row = await model.query().where(getIdKey(options?.key), params.id).firstOrFail()

    if (options?.ability) {
      if (!bouncer) throw new Error('@adonisjs/bouncer is required to use abilities')
      await bouncer.authorize(options.ability, row)
    }

    if (options?.mutate) {
      await options.mutate(row, data as Infer<typeof validator>)
    } else {
      row.merge(data)
    }

    await row.save()
    return success(response, row.toJSON(), 200)
  }
}

export function destroy<Model extends typeof BaseModel>(
  model: Model,
  options?: { ability?: BoucerAbility }
) {
  return async ({ params, response, bouncer }: HttpContext) => {
    const row = await model.query().where(getIdKey(), params.id).firstOrFail()

    if (options?.ability) {
      if (!bouncer) throw new Error('@adonisjs/bouncer is required to use abilities')
      await bouncer.authorize(options.ability, row)
    }

    await row.delete()

    return success(response)
  }
}

export type CrudVerb = typeof index | typeof show | typeof store | typeof update | typeof destroy
