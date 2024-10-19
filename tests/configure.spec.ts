import { test } from '@japa/runner'
import Configure from '@adonisjs/core/commands/configure'
import { createIgnitor } from './utils/ignitor.js'
import { setupFakeAdonisProject } from './utils/fs.js'
import { AceFactory } from '@adonisjs/core/factories'

test.group('Configure', (group) => {
  group.each.disableTimeout()

  test('create config file and register provider', async ({ assert, fs }) => {
    await setupFakeAdonisProject(fs)

    const ace = await new AceFactory().make(createIgnitor(fs))
    await ace.app.boot()
    await ace.app.init()

    ace.prompt.trap('Do you want to use UUID?').accept()
    ace.prompt.trap('Do you want to use Soft Deletes?').accept()

    const command = await ace.create(Configure, ['../index.js'])
    await command.exec()

    await assert.fileExists('./config/dreamer.ts')
  })
})
