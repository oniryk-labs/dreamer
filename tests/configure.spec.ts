import { test } from '@japa/runner'
import Configure from '@adonisjs/core/commands/configure'
import { createIgnitor } from './utils/ignitor.js'
import { setupFakeAdonisProject, setupNpm } from './utils/fs.js'
import { AceFactory } from '@adonisjs/core/factories'

test.group('Configure', (group) => {
  group.each.disableTimeout()

  test('create config file and register provider', async ({ assert, fs }) => {
    await setupFakeAdonisProject(fs)
    await setupNpm(fs)

    const ace = await new AceFactory().make(createIgnitor(fs))
    await ace.app.boot()
    await ace.app.init()

    // auto reply to prompts
    ;[
      'would you like to use UUID?',
      'do you need to setup Postgres UUID extension?',
      'would you like to use soft deletes?',
      'would you like to use Bruno as api client? (see: https://usebruno.com)',
      'are you using @adonisjs/auth in your project?',
      'would you like to add auth header for each request?',
      'would you like to create a login request?',
      'would you like to use dreamer as default exception handler?',
    ].forEach((p) => ace.prompt.trap(p).accept())

    Object.entries({
      "where would you like to save Bruno's files": '/docs',
      'what is the route to get the auth token?': '/auth/sessions',
      'what is the username field?': 'username',
      'and the password field?': 'password',
      'what is the path to the token in the response?': 'data.user.token',
    }).forEach(([question, answer]) => ace.prompt.trap(question).replyWith(answer))

    const command = await ace.create(Configure, ['../index.js'])
    await command.exec()

    await assert.fileExists('./config/dreamer.ts')
  })
})
