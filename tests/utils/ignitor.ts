import { Ignitor } from '@adonisjs/core'
import { IgnitorFactory, TestUtilsFactory } from '@adonisjs/core/factories'
import { defineConfig } from '@adonisjs/lucid'
import { FileSystem } from '@japa/file-system'
import { fileURLToPath } from 'node:url'
import { defineConfig as defineDreamerConfig } from '../../define_configs.js'

export const dbConfig = defineConfig({
  connection: 'sqlite',
  connections: {
    sqlite: {
      client: 'sqlite',
      connection: {
        filename: fileURLToPath(new URL('../../tmp/database.sqlite', import.meta.url).href),
      },
      migrations: {
        naturalSort: true,
        paths: [fileURLToPath(new URL('../../tmp/database/migrations', import.meta.url).href)],
      },
      useNullAsDefault: true,
    },
  },
})

export function createIgnitor(
  fs: FileSystem,
  flags?: {
    withDatabase?: boolean
  }
) {
  const ignitor = new IgnitorFactory()
    .withCoreProviders()
    .merge({
      rcFileContents: {
        providers: [
          () => import('@adonisjs/core/providers/app_provider'),
          () => import('@adonisjs/core/providers/vinejs_provider'),
          ...(flags?.withDatabase ? [() => import('@adonisjs/lucid/database_provider')] : []),
        ],
      },
      config: {
        dreamer: defineDreamerConfig({
          useUUID: true,
          useSoftDelete: true,
        }),
      },
    })
    .withCoreConfig()

  if (flags?.withDatabase) {
    ignitor.merge({
      config: {
        database: dbConfig,
      },
    })
  }

  return ignitor.create(fs.baseUrl, {
    importer: (filePath) => {
      if (filePath.startsWith('./') || filePath.startsWith('../')) {
        return import(new URL(filePath, fs.baseUrl).href)
      }

      return import(filePath)
    },
  })
}

export async function createTestUtils(ignitor: Ignitor, flags?: { autoInitialize?: boolean }) {
  const utils = new TestUtilsFactory().create(ignitor)

  if (flags?.autoInitialize) {
    await utils.app.init()
    await utils.app.boot()
    await utils.boot()
  }

  return utils
}
