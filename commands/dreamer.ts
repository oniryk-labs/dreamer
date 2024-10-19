import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import TSMorphMigrationParser from '../src/codegen/ts-morph/parsers/migration.js'

import { DreamerConfig } from '../types.js'
import { generateModel } from '../src/codegen/model.js'
import { stubsRoot } from '../stubs/main.js'
import { watchFileOnce } from '../tests/utils/fs.js'
import { generateVineSchema } from '../src/codegen/vine.js'
import { ControllerAction, generateController } from '../src/codegen/controller.js'
import { generateRoutes, normalizeActions, UnsupportedActions } from '../src/codegen/route.js'
import { generateNaming } from '../src/codegen/naming.js'
import { addImportIfNotExists } from '../src/codegen/ts-morph/imports.js'
import colors from '@poppinss/colors'
import { waitWithAnimation } from '../src/helpers.js'
import { pickAndInstallFormatter } from '../src/codegen/formatter.js'
import { Emitter } from '../src/emitter.js'

export const DreamerEvent = {
  'migration:created': Symbol('migration:created'),
  'before:formats:install': Symbol('before:formats:install'),
  'after:formats:install': Symbol('after:formats:install'),
  'command:done': Symbol('command:done'),
}

const emitter = new Emitter()

export default class Dreamer extends BaseCommand {
  #formatters: string[] = []
  #actions: ControllerAction[] = []
  #config?: DreamerConfig
  #naming?: ReturnType<typeof generateNaming>

  static commandName = 'dreamer'
  static description = 'Dreamer command to generate entities and more.'

  static get emitter() {
    return emitter
  }

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({
    argumentName: 'table',
    description: 'table name',
  })
  declare table: string

  @flags.boolean({ default: false })
  declare interactive: boolean

  @flags.boolean({ default: true, description: 'generate model file' })
  declare model: boolean

  @flags.boolean({ default: true, description: 'generate controller file' })
  declare controller: boolean

  @flags.boolean({ default: true, description: 'generate routes file' })
  declare factory: boolean

  @flags.boolean({ default: true, description: 'generate validator file' })
  declare validator: boolean

  @flags.array({
    default: ['index', 'show', 'store', 'update', 'destroy'],
    description: 'controller actions to generate',
  })
  declare actions: string[]

  @flags.boolean({ default: true })
  declare tests: boolean

  configure() {
    this.#config = this.app.config.get('dreamer') as DreamerConfig
    this.#naming = generateNaming(this.table)

    let unsupported: UnsupportedActions[]
    ;[this.#actions, unsupported] = normalizeActions(this.actions)

    if (unsupported.length) {
      this.logger.error(`Unsupported actions: ${unsupported.join(', ')}`)
      return false
    }

    return true
  }

  async run() {
    if (!this.configure()) {
      return
    }

    const codemods = await this.createCodemods()
    const project = (await codemods.getTsMorphProject())!

    await codemods.makeUsingStub(stubsRoot, 'migration.stub', {
      tableName: this.#naming!.migration.table,
      migrationName: this.#naming!.migration.file,
      ...this.#config,
    })

    const migrationRelativePath = `database/migrations/${this.#naming!.migration.file}`
    const migrationFilePath = this.app.makePath(migrationRelativePath)
    const coloredMigrationFile = colors.ansi().cyan(migrationRelativePath)

    this.ui
      .instructions()
      .add(`open ${coloredMigrationFile}`)
      .add(`customize with your requirements, then ${colors.ansi().cyan('save to continue')}`)
      .render()

    if (Dreamer.emitter.has(DreamerEvent['migration:created'])) {
      await Dreamer.emitter.emit(DreamerEvent['migration:created'], migrationFilePath)
    } else {
      await waitWithAnimation(
        this.logger,
        async () => await watchFileOnce(migrationFilePath),
        'waiting your changes'
      )
    }

    this.logger.action(`saved ${coloredMigrationFile}`).succeeded()

    project.addSourceFileAtPath(migrationFilePath)
    const source = project.getSourceFileOrThrow(migrationFilePath)
    const tableStruct = new TSMorphMigrationParser(source).extractTableStructure()

    if (this.model) {
      const modelOptions = generateModel(this.table, this.#config!, tableStruct)

      await codemods.makeUsingStub(stubsRoot, 'model.stub', {
        name: this.#naming!.model.name,
        file: this.#naming!.model.file,
        ...modelOptions,
      })
    }

    if (this.controller) {
      if (this.#actions.length === 0 || this.#actions.includes('index')) {
        await Dreamer.emitter.emit(DreamerEvent['before:formats:install'], null)
        this.#formatters = await pickAndInstallFormatter(this)
        await Dreamer.emitter.emit(DreamerEvent['after:formats:install'], null)
      }

      const controllerFilename = this.#naming!.controller.file
      const hasUpdate = this.#actions.includes('update')
      const hasStore = this.#actions.includes('store')

      const content = generateVineSchema(tableStruct, {
        updateSchema: hasUpdate,
        createSchema: hasStore,
      })

      await codemods.makeUsingStub(stubsRoot, 'validator.stub', {
        path: this.#naming!.validator.file,
        content,
      })

      const controllerContent = generateController({
        model: this.#naming!.model,
        controller: this.#naming!.controller,
        validator: this.#naming!.validator,
        actions: this.#actions,
        formatters: this.#formatters,
      })

      await codemods.makeUsingStub(stubsRoot, 'controller.stub', {
        content: controllerContent,
        path: controllerFilename,
      })

      const routesContent = generateRoutes({
        entity: this.table,
        configs: this.#config!,
        actions: this.#actions,
      })

      const [router] = project!.getSourceFiles(`**/start/routes.ts`)

      addImportIfNotExists(router, this.#naming!.route.import)

      await codemods.makeUsingStub(stubsRoot, 'route.stub', routesContent)

      const { runMigrator } = await import('../src/migrator.js')
      await runMigrator(this)
      await Dreamer.emitter.emit(DreamerEvent['command:done'], null)
    }
  }
}
