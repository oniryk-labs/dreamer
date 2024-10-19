import { test } from '@japa/runner'
import { AceFactory } from '@adonisjs/core/factories'
import Dreamer, { DreamerEvent } from '../commands/dreamer.js'
import { fileURLToPath } from 'node:url'
import { createIgnitor } from './utils/ignitor.js'
import { replaceContent, setupFakeAdonisProject, setupNpm } from './utils/fs.js'
import path from 'node:path'
import { readFile } from 'node:fs/promises'

test.group('Command', (group) => {
  group.each.disableTimeout()

  test('create files to "post" entity', async ({ fs }) => {
    await setupFakeAdonisProject(fs)
    const ignitor = createIgnitor(fs, { withDatabase: true })

    const ace = await new AceFactory().make(ignitor)

    ;[
      'would you like to add custom formats to "index" response (ex: csv, xls)',
      'the following packages are not installed: @oniryk/dreamer-csv, @oniryk/dreamer-xls. Would you like to install them?',
      'the following packages are not installed: @oniryk/dreamer-csv. Would you like to install them?',
      'the following packages are not installed: @oniryk/dreamer-xls. Would you like to install them?',
      'would you like to run migrations now?',
    ].forEach((message) => ace.prompt.trap(message).accept())

    ace.prompt.trap('select formats to add').chooseOptions([1])
    await ace.app.boot()
    await ace.app.init()

    Dreamer.emitter.on(DreamerEvent['before:formats:install'], async () => {
      await setupNpm(fs)
    })

    await new Promise<void>(async (resolve) => {
      Dreamer.emitter.on(DreamerEvent['migration:created'], async (file: string) => {
        const template = path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          'templates/migration.txt'
        )
        const content = await readFile(template)
        const random = Math.random().toString(36).substring(7)

        await replaceContent(file as string, {
          content: content.toString().replace('__TABLE_NAME__', `table_${random}`),
        })
      })

      Dreamer.emitter.on(DreamerEvent['command:done'], async () => resolve())

      const command = await ace.create(Dreamer, ['post'])
      await command.prepare()
      await command.run()

      Dreamer.emitter.clear()
    })
  })
})
