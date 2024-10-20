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
import { CodeTransformer } from '@adonisjs/assembler/code_transformer'
import { prettify } from '../src/codegen/prettier.js'

export const DreamerEvent = {
  'migration:created': Symbol('migration:created'),
  'before:formats:install': Symbol('before:formats:install'),
  'after:formats:install': Symbol('after:formats:install'),
  'command:done': Symbol('command:done'),
}

const emitter = new Emitter()
const cyan = (s: string) => colors.ansi().cyan(s)

export default class Dreamer extends BaseCommand {
  #formatters: string[] = []
  #actions: ControllerAction[] = []
  #config?: DreamerConfig
  #naming?: ReturnType<typeof generateNaming>
  #mod?: Awaited<ReturnType<BaseCommand['createCodemods']>>
  #project?: InstanceType<typeof CodeTransformer>['project']

  static commandName = 'dreamer'
  static description = 'generate CRUD resources for a given entity'

  static get emitter() {
    return emitter
  }

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({
    argumentName: 'entity',
    description: 'name of the entity to generate CRUD resources for',
  })
  declare entity: string

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

  async prepare() {
    this.#config = this.app.config.get('dreamer') as DreamerConfig
    this.#naming = generateNaming(this.entity)
    this.#mod = await this.createCodemods()
    this.#project = await this.#mod.getTsMorphProject()

    let unsupported: UnsupportedActions[]
    ;[this.#actions, unsupported] = normalizeActions(this.actions)

    if (unsupported.length) {
      throw new Error(`unsupported actions: ${unsupported.join(', ')}`)
    }
  }

  async run() {
    const $emitter = Dreamer.emitter

    // STEP 1: Create migration and wait for changes
    const migrationRelativePath = `database/migrations/${this.#naming!.migration.file}`
    const migrationFilePath = this.app.makePath(migrationRelativePath)

    await this.makeUsingStub('migration.stub', {
      tableName: this.#naming!.migration.table,
      migrationName: this.#naming!.migration.file,
      ...this.#config,
    })

    this.ui
      .instructions()
      .add(`open ${cyan(migrationRelativePath)}`)
      .add(`customize with your requirements, then ${cyan('save to continue')}`)
      .render()

    if ($emitter.has(DreamerEvent['migration:created'])) {
      // Fakes the file change when runnig tests
      await $emitter.emit(DreamerEvent['migration:created'], migrationFilePath)
    } else {
      await waitWithAnimation({
        logger: this.logger,
        message: 'waiting for your change. it will continue once you save the file',
        action: async () => {
          await watchFileOnce(migrationFilePath)
          this.logger.action(`saved ${cyan(migrationRelativePath)}`).succeeded()
        },
      })
    }

    // STEP 2: Parse migration
    const source = this.#project!.addSourceFileAtPath(migrationFilePath)
    const tableStruct = new TSMorphMigrationParser(source).extractTableStructure()

    // STEP 3: Generate model file
    if (this.model) {
      const modelOptions = generateModel(this.entity, this.#config!, tableStruct)

      await this.makeUsingStub('model.stub', {
        name: this.#naming!.model.name,
        file: this.#naming!.model.file,
        ...modelOptions,
      })
    }

    // STEP 4: Generate validator file
    await this.makeUsingStub('validator.stub', {
      path: this.#naming!.validator.file,
      content: generateVineSchema(tableStruct, {
        updateSchema: this.#actions.includes('update'),
        createSchema: this.#actions.includes('store'),
      }),
    })

    // STEP 5: Generate controller and routes
    if (this.controller) {
      if (this.#actions.length === 0 || this.#actions.includes('index')) {
        await $emitter.emit(DreamerEvent['before:formats:install'], null)
        this.#formatters = await pickAndInstallFormatter(this)
        await $emitter.emit(DreamerEvent['after:formats:install'], null)
      }

      const controllerContent = generateController({
        model: this.#naming!.model,
        controller: this.#naming!.controller,
        validator: this.#naming!.validator,
        actions: this.#actions,
        formatters: this.#formatters,
      })

      await this.makeUsingStub('controller.stub', {
        content: controllerContent,
        path: this.#naming!.controller.file,
      })

      const routesContent = generateRoutes({
        entity: this.entity,
        configs: this.#config!,
        actions: this.#actions,
      })

      // Add import to main routes file
      const router = this.#project!.getSourceFileOrThrow(this.app.makePath('start/routes.ts'))
      addImportIfNotExists({ sourceFile: router, moduleSpecifier: this.#naming!.route.import })

      // Create route file for the entity
      await this.makeUsingStub('route.stub', routesContent)
    }

    // STEP 6: Run migrations
    if (await this.prompt.confirm('would you like to run migrations now?', { default: true })) {
      const { runMigrator } = await import('../src/migrator.js')
      await runMigrator(this)
    }

    // FINAL: Emit command done (used for testing)
    await $emitter.emit(DreamerEvent['command:done'], null)
  }

  async makeUsingStub(stubPath: string, stubState: Record<string, any>) {
    try {
      const { destination } = await this.#mod!.makeUsingStub(stubsRoot, stubPath, stubState)
      const target = destination?.to || destination || ''

      if (target.endsWith('.ts')) {
        await prettify([target])
      }
    } catch (error) {
      this.logger.error(error.message)
    }
  }
}
