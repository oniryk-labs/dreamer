//@ts-ignore
import { jsonToBruV2 } from '@usebruno/lang'
import { faker } from '@faker-js/faker'
import path from 'node:path'
import { TableStructure } from './ts-morph/parsers/migration.js'
import { randomInt, randomUUID } from 'node:crypto'
import { ControllerAction } from './controller.js'
const randomFloat = (precision: number) => Number((Math.random() * 100).toFixed(precision))

export type LowercaseMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'
export type HttpMethod = LowercaseMethod | Uppercase<LowercaseMethod>

export type BrunoRequestOptions = {
  name: string
  method: HttpMethod
  /** url without the base url*/
  urlSegment: string
  json?: Record<string, any> | any[]
  headers?: Record<string, string>
  useAuth?: boolean
  seq?: number
}

export type Param = {
  name: string
  value: string
  type: 'path' | 'query'
  enabled: boolean
}

export function createBrunoRequest(params: BrunoRequestOptions) {
  const url = new URL(params.urlSegment, 'http://dev')
  const pathParams = url.pathname.split('/').filter((c) => c.startsWith(':'))
  const queryParams = url.searchParams.entries()

  return jsonToBruV2({
    meta: {
      name: params.name,
      type: 'http',
      seq: String(params.seq ?? 0),
    },
    http: {
      method: params.method.toLowerCase() as LowercaseMethod,
      url: path.join('{{baseurl}}', url.pathname),
      ...(params.json ? { body: 'json' } : {}),
      ...(params.useAuth ? { auth: 'bearer' } : {}),
    },
    params: [
      ...pathParams.map((name) => ({
        name: name.slice(1),
        value: '',
        type: 'path',
        enabled: true,
      })),
      ...Array.from(queryParams).map(([name, value]) => ({
        name,
        value,
        type: 'query',
        enabled: true,
      })),
    ],
    headers: [
      {
        name: 'content-type',
        value: 'application/json',
        enabled: true,
      },
    ],
    ...(params.useAuth
      ? {
          auth: {
            bearer: {
              token: '{{access_token}}',
            },
          },
        }
      : {}),
    ...(params.json
      ? {
          body: {
            json: JSON.stringify(params.json, null, 2),
          },
        }
      : {}),
  })
}

export function convertMigrationToBody(columns: TableStructure['columns']) {
  return columns
    .filter((c) => !['id', 'created_at', 'updated_at', 'deleted_at', 'uuid'].includes(c.name))
    .reduce(
      (acc, cur) => {
        switch (cur.type) {
          case 'string':
          case 'text':
            acc[cur.name] = fakerStringSuggest(cur.name)
            break
          case 'increments':
          case 'integer':
          case 'bigInteger':
            acc[cur.name] = randomInt(1, 100000)
            break
          case 'float':
          case 'decimal':
            acc[cur.name] = randomFloat(2)
            break
          case 'boolean':
            acc[cur.name] = true
            break
          case 'date':
            acc[cur.name] = new Date().toISOString().split('T')[0]
            break
          case 'dateTime':
          case 'timestamp':
            acc[cur.name] = new Date().toISOString()
            break
          case 'time':
            acc[cur.name] = '00:00:00'
            break
          case 'json':
          case 'jsonb':
            acc[cur.name] = {
              [faker.lorem.words(1)]: faker.lorem.words(randomInt(1, 10)),
              [faker.lorem.words(1)]: faker.lorem.words(randomInt(1, 10)),
              [faker.lorem.words(1)]: faker.lorem.words(randomInt(1, 10)),
            }
            break
          case 'enum':
          case 'enu':
            acc[cur.name] = (cur.options[0] as string[])[0] as string
            break
          case 'uuid':
            acc[cur.name] = randomUUID()
            break
          case 'binary':
            acc[cur.name] = '<<binary>>'
            break
          default:
            throw new Error(`Type ${cur.type} not supported`)
        }

        return acc
      },
      {} as Record<string, any>
    )
}

export function fakerStringSuggest(name: string) {
  if (name.includes('email')) {
    return faker.internet.email()
  }

  if (name.includes('phone')) {
    return faker.phone.number()
  }

  if (name.includes('name')) {
    return faker.person.fullName()
  }

  if (name.includes('title') || name.includes('description')) {
    return faker.lorem.words(4)
  }

  if (name.includes('address')) {
    return faker.location.streetAddress()
  }

  return faker.lorem.words(randomInt(1, 10))
}

export function actionToMethod(action: string) {
  switch (action) {
    case 'index':
    case 'show':
      return 'get'
    case 'store':
      return 'post'
    case 'update':
      return 'put'
    case 'destroy':
      return 'delete'
    default:
      throw new Error(`Action ${action} not supported`)
  }
}

export function createBrunoRequestFromMigration({
  baseurl,
  migration,
  actions,
  useAuth,
}: {
  baseurl: string
  migration: TableStructure
  actions: ControllerAction[]
  useAuth?: boolean
}) {
  return ['index', 'show', 'store', 'update', 'destroy'].reduce(
    (acc, cur) => {
      if (actions.includes(cur as ControllerAction)) {
        const param = ['show', 'update', 'destroy'].includes(cur) ? '/:id' : ''
        const json = ['store', 'update'].includes(cur)
          ? convertMigrationToBody(migration.columns)
          : undefined

        acc.push({
          file: `${cur}.bru`,
          content: createBrunoRequest({
            name: cur,
            method: actionToMethod(cur),
            urlSegment: `${baseurl}/${param}`,
            json,
            seq: acc.length,
            useAuth,
          }),
        })
      }

      return acc
    },
    [] as { file: string; content: BrunoRequestOptions }[]
  )
}
