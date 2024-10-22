/*
|--------------------------------------------------------------------------
| Configure hook
|--------------------------------------------------------------------------
|
| The configure hook is called when someone runs "node ace configure <package>"
| command. You are free to perform any operations inside this function to
| configure the package.
|
| To make things easier, you have access to the underlying "ConfigureCommand"
| instance and you can use codemods to modify the source files.
|
*/
import ConfigureCommand from '@adonisjs/core/commands/configure'
import { DatabaseConfig } from '@adonisjs/lucid/types/database'
import { changeDefaultExceptionHandler } from './src/codegen/ts-morph/exception_handler.js'

import { DreamerConfig } from './types.js'
import StubRenderer from './src/codegen/stub.js'

import path from 'node:path'
import { getPackageName } from './src/package.js'
import TaskPlanner from './src/task_planner.js'
import { createBrunoRequest } from './src/codegen/bruno.js'

export async function configure(command: ConfigureCommand) {
  const codemods = await command.createCodemods()
  const project = (await codemods.getTsMorphProject())!
  const ask = new TaskPlanner(command)
  const stubs = new StubRenderer(codemods)
  const db = command.app.config.get('database') as DatabaseConfig

  // Plan the tasks
  const options = await ask.script([
    {
      type: 'boolean',
      key: 'useUUID',
      question: 'would you like to use UUID?',
      defaultValue: true,
    },
    {
      type: 'boolean',
      key: 'useUUIDExtension',
      question: 'do you need to setup Postgres UUID extension?',
      defaultValue: false,
      when: (s) => s.useUUID && db?.connection === 'postgres',
    },
    {
      type: 'boolean',
      key: 'useSoftDelete',
      question: 'would you like to use soft deletes?',
      defaultValue: true,
    },
    {
      type: 'boolean',
      key: 'brunoEnabled',
      question: 'would you like to use Bruno as api client? (see: https://usebruno.com)',
      defaultValue: false,
    },
    {
      type: 'string',
      key: 'brunoDocumentsDir',
      question: "where would you like to save Bruno's files",
      defaultValue: '/docs',
      when: (s) => s.brunoEnabled,
    },
    {
      type: 'boolean',
      key: 'projectUseAuth',
      question: 'are you using @adonisjs/auth in your project?',
      defaultValue: false,
      when: (s) => s.brunoEnabled,
    },
    {
      type: 'boolean',
      key: 'brunoUseAuth',
      question: 'would you like to add auth header for each request?',
      defaultValue: true,
      when: (s) => s.projectUseAuth,
    },
    {
      type: 'boolean',
      key: 'brunoSetupAuth',
      question: 'would you like to create a login request?',
      defaultValue: true,
      when: (s) => s.projectUseAuth,
    },
    {
      type: 'string',
      key: 'brunoAuthRoute',
      question: 'what is the route to get the auth token?',
      defaultValue: '/auth/sessions',
      when: (s) => s.brunoSetupAuth,
    },
    {
      type: 'string',
      key: 'brunoAuthUsername',
      question: 'what is the username field?',
      defaultValue: 'email',
      when: (s) => s.brunoSetupAuth,
    },
    {
      type: 'string',
      key: 'brunoAuthPassword',
      question: 'and the password field?',
      defaultValue: 'password',
      when: (s) => s.brunoSetupAuth,
    },
    {
      type: 'string',
      key: 'brunoAuthTokenPath',
      question: 'what is the path to the token in the response?',
      defaultValue: 'data.user.token',
      when: (s) => s.brunoSetupAuth,
    },
  ])

  await stubs.render('config.stub', {
    options: {
      useUUID: options.useUUID,
      useSoftDelete: options.useSoftDelete,
      ...(options.brunoEnabled
        ? {
            bruno: {
              enabled: options.brunoEnabled,
              documentsDir: options.brunoDocumentsDir,
              useAuth: options.brunoUseAuth,
            },
          }
        : {}),
    } as DreamerConfig,
  })

  await codemods.updateRcFile((rcFile) => {
    rcFile.addCommand('@oniryk/dreamer/commands')
  })

  const [handler] = project.getSourceFiles(command.app.makePath('exceptions/handler.ts'))
  changeDefaultExceptionHandler(handler)
  command.logger.action('update app/exceptions/handler.ts').succeeded()

  await stubs.render('bruno.request.stub', {
    filepath: path.join(options.brunoDocumentsDir, '/posts/store.bru'),
    content: createBrunoRequest({
      name: 'index',
      method: 'GET',
      urlSegment: '/posts/:id?f=csv',
      useAuth: true,
      json: {
        name: 'John Doe',
        age: 30,
      },
    }),
  })

  if (options.brunoEnabled) {
    const docsDir = (s: string) => path.join(options.brunoDocumentsDir, s)
    await stubs.render('bruno.collection.stub', {
      filepath: docsDir('bruno.json'),
      name: await getPackageName(command.app.makePath('.')),
    })
    await stubs.render('bruno.environments.stub', { filepath: docsDir('environments/local.bru') })

    if (options.brunoSetupAuth) {
      await stubs.render('bruno.auth.stub', {
        filepath: docsDir('auth/sessions/store.bru'),
        username: options.brunoAuthUsername,
        password: options.brunoAuthPassword,
        tokenPath: options.brunoAuthTokenPath,
        url: '/auth/sessions',
      })
    }
  }
}
