import type { NormalizeConstructor } from '@adonisjs/core/types/helpers'
import type {
  ExtractScopes,
  LucidModel,
  ModelAdapterOptions,
  ModelQueryBuilderContract,
} from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

import {
  BaseModel,
  beforeFetch,
  beforeFind,
  beforePaginate,
  beforeSave,
  column,
} from '@adonisjs/lucid/orm'

export type ExcludeUndefined<T> = T extends undefined ? never : T
export type Scopes<T extends LucidModel> = ExcludeUndefined<keyof ExtractScopes<T>>
export type UUIDOptions = { overrideFind?: boolean }

export function withUUID(opts?: UUIDOptions) {
  return <Model extends NormalizeConstructor<typeof BaseModel>>(superclass: Model) => {
    class ModelWithUUID extends superclass {
      @column({ isPrimary: true, serializeAs: null })
      declare id: number

      @column()
      declare uuid: string

      @beforeSave()
      static generateUUID(instance: ModelWithUUID) {
        if (!instance.uuid) {
          instance.uuid = randomUUID()
        }
      }

      static async find<T extends typeof BaseModel>(
        this: T,
        id: string,
        options?: ModelAdapterOptions
      ) {
        if (opts?.overrideFind === false) {
          return super.find(id, options)
        }

        return this.findBy('uuid', id, options)
      }

      static async findOrFail<T extends typeof BaseModel>(
        this: T,
        id: string,
        options?: ModelAdapterOptions
      ) {
        if (opts?.overrideFind === false) {
          return super.findOrFail(id, options)
        }

        return this.findByOrFail('uuid', id, options)
      }

      static async findByUuid<T extends typeof BaseModel>(
        this: T,
        id: string,
        options?: ModelAdapterOptions
      ) {
        return this.findBy('uuid', id, options)
      }

      static async findByUuidOrFail<T extends typeof BaseModel>(
        this: T,
        id: string,
        options?: ModelAdapterOptions
      ) {
        return this.findByOrFail('uuid', id, options)
      }
    }

    return ModelWithUUID
  }
}

export function withSoftDelete() {
  return <Model extends NormalizeConstructor<typeof BaseModel>>(superclass: Model) => {
    class ModelWithSoftDelete extends superclass {
      @column.dateTime({ autoCreate: true })
      declare createdAt: DateTime

      @column.dateTime({ autoCreate: true, autoUpdate: true })
      declare updatedAt: DateTime

      @column.dateTime({ autoCreate: false, serializeAs: null })
      declare deletedAt: DateTime | null

      @beforeFetch()
      @beforeFind()
      static ignoreDeletedBeforeFetch(
        query: ModelQueryBuilderContract<typeof ModelWithSoftDelete>
      ) {
        query.whereNull(`${query.model.table}.deleted_at`)
      }

      @beforePaginate()
      static ignoreDeletedBeforePaginate([query, countQuery]: [
        ModelQueryBuilderContract<typeof ModelWithSoftDelete>,
        ModelQueryBuilderContract<typeof ModelWithSoftDelete>,
      ]) {
        query.whereNull(`${query.model.table}.deleted_at`)
        countQuery.whereNull(`${query.model.table}.deleted_at`)
      }

      async delete() {
        this.deletedAt = DateTime.now()
        await this.save()
      }
    }

    return ModelWithSoftDelete
  }
}

export type SearchableModel = typeof BaseModel & { searchable?: string[] }

export function parseModelSeachableFields(model: SearchableModel) {
  if (!model.searchable) {
    return {}
  }

  return model.searchable.reduce(
    (acc, field) => {
      if (field.startsWith('like:')) {
        const name = field.replace('like:', '')
        acc[name] = 'like'
      } else {
        acc[field] = 'equals'
      }

      return acc
    },
    {} as Record<string, 'like' | 'equals'>
  )
}
