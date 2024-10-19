import { MigrationRunner } from '@adonisjs/lucid/migration'
import { BaseCommand } from '@adonisjs/core/ace'

export async function runMigrator(command: BaseCommand) {
  const runMigrations = await command.prompt.confirm('would you like to run migrations now?', {
    default: true,
  })

  if (!runMigrations) {
    return
  }

  const db = await command.app.container.make('lucid.db')

  const migrator = new MigrationRunner(db, command.app, {
    direction: 'up',
    dryRun: false,
  })

  await migrator.run()

  if (migrator.status === 'completed') {
    command.logger.success('migrations completed successfully')
  } else {
    command.logger.error('migrations failed. please try running them manually')
    console.log(migrator)
  }

  db.manager.closeAll()
}
