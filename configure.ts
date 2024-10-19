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
import { stubsRoot } from './stubs/main.js'

export async function configure(command: ConfigureCommand) {
  const codemods = await command.createCodemods()
  const project = (await codemods.getTsMorphProject())!

  const useUUID = await command.prompt.confirm('Do you want to use UUID?', {
    name: 'useUUID',
    default: true,
  })

  if (useUUID) {
    const db = command.app.config.get('database') as DatabaseConfig

    if (db && db.connection === 'postgres') {
      const useUUIDExtension = await command.prompt.confirm(
        'Do you want to setup UUID extension?',
        {
          name: 'useUUIDExtension',
          default: true,
        }
      )

      if (useUUIDExtension) {
        await codemods.makeUsingStub(stubsRoot, 'uuid.stub', {})
      }
    }
  }

  const useSoftDeletes = await command.prompt.confirm('Do you want to use Soft Deletes?', {
    name: 'useSoftDeletes',
    default: true,
  })

  await codemods.makeUsingStub(stubsRoot, 'config.stub', {
    useUUID,
    useSoftDeletes,
  })

  await codemods.updateRcFile((rcFile) => {
    rcFile.addCommand('@oniryk/dreamer/commands')
  })

  const [handler] = project.getSourceFiles(command.app.makePath('exceptions/handler.ts'))
  changeDefaultExceptionHandler(handler)
  command.logger.action('update app/exceptions/handler.ts').succeeded()
}
