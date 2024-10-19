import knex from 'knex'
import { dbConfig } from './ignitor.js'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import { compose } from '@adonisjs/core/helpers'
import { withSoftDelete, withUUID } from '../../src/extensions/lucid.js'

export const USER_1_UUID = randomUUID()
export const USER_2_UUID = randomUUID()

export function getKnex(config: knex.Knex.Config): knex.Knex {
  return knex.knex(Object.assign({}, config, { debug: false }))
}

export async function setupDatabase() {
  const db = getKnex(dbConfig.connections[dbConfig.connection])
  const hasUsersTable = await db.schema.hasTable('users')

  if (!hasUsersTable) {
    await db.schema.createTable('users', (table) => {
      table.increments()
      table.string('uuid').notNullable().index().unique()
      table.string('full_name').notNullable()
      table.string('username').notNullable()
      table.string('email', 254).notNullable().unique()
      table.dateTime('created_at').defaultTo(db.fn.now())
      table.dateTime('updated_at').nullable()
      table.dateTime('deleted_at').nullable()
    })
  }

  await db.queryBuilder().table('users').truncate()

  const baseDate = DateTime.local().toSQL({
    includeOffset: false,
    includeOffsetSpace: false,
  })

  await db
    .queryBuilder()
    .table('users')
    .insert([
      {
        id: 1,
        uuid: USER_1_UUID,
        full_name: 'dreamer',
        username: 'dreamer',
        email: 'dreamer@oniryk.dev',
        created_at: baseDate,
        updated_at: baseDate,
        deleted_at: null,
      },
      {
        id: 2,
        uuid: USER_2_UUID,
        full_name: 'nightmare',
        username: 'nightmare',
        email: 'nightmare@oniryk.dev',
        created_at: baseDate,
        updated_at: baseDate,
        deleted_at: null,
      },
    ])

  await db.destroy()
}

export function getUserModel() {
  class User extends compose(BaseModel, withUUID(), withSoftDelete()) {
    @column()
    declare email: string

    @column()
    declare fullName: string

    @column()
    declare username: string
  }

  User.boot()

  return User
}
