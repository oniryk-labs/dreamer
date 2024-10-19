import stringHelpers from '@adonisjs/core/helpers/string'
import { ColumnDefinition, TableStructure } from './ts-morph/parsers/migration.js'
import { pipe } from '../helpers.js'

const { singular, pascalCase } = stringHelpers
const RESERVED_COLUMNS = ['id', 'uuid', 'created_at', 'updated_at', 'deleted_at']

export function removeReservedColumns(columns: ColumnDefinition[]): ColumnDefinition[] {
  return columns.filter((column) => !RESERVED_COLUMNS.includes(column.name))
}

interface SchemaOptions {
  createSchema?: boolean
  updateSchema?: boolean
}

export function generateVineSchema(schema: TableStructure, options: SchemaOptions = {}): string {
  const imports = ["import vine from '@vinejs/vine'", "import { Infer } from '@vinejs/vine/types'"]
  const entity = pipe(singular, pascalCase)(schema.table) as string
  const needsTimeRegex = schema.columns.some((column) => column.type === 'time')

  if (needsTimeRegex) {
    imports.push("import { timeRegex } from '@oniryk/dreamer/extensions/validation'")
  }

  const columnDefinitions = removeReservedColumns(schema.columns)
    .map((column) => generateColumnDefinition(column))
    .join('\n')

  const columnDefinitionsUpdate = removeReservedColumns(schema.columns)
    .map((column) => generateColumnDefinition(column, true))
    .join('\n')

  const createSchemaDefinition = `const create = vine.object({\n${columnDefinitions}\n})`
  const updateSchemaDefinition = `const update = vine.object({\n${columnDefinitionsUpdate}\n})`

  const createExportStatement = `export const validate${entity}Create = vine.compile(create)`
  const updateExportStatement = `export const validate${entity}Update = vine.compile(update)`

  const schemaDefinitions = []
  const exportStatements = []
  const typeStatements = []

  if (options.createSchema) {
    schemaDefinitions.push(createSchemaDefinition)
    exportStatements.push(createExportStatement)
  }

  if (options.updateSchema) {
    schemaDefinitions.push(updateSchemaDefinition)
    exportStatements.push(updateExportStatement)
  }

  if (options.createSchema) {
    typeStatements.push(
      `export type ${entity}CreatePayload = Infer<typeof validate${entity}Create>`
    )
  }

  if (options.updateSchema) {
    typeStatements.push(
      `export type ${entity}UpdatePayload = Infer<typeof validate${entity}Update>`
    )
  }

  return `${imports.join('\n')}\n\n${schemaDefinitions.join('\n\n')}\n\n${exportStatements.join('\n')}\n\n${typeStatements.join('\n')}`
}

export function generateColumnDefinition(
  column: ColumnDefinition,
  isUpdate: boolean = false
): string {
  let definition = `vine`

  switch (column.type) {
    case 'increments':
    case 'integer':
    case 'bigInteger':
      definition += '.number().withoutDecimals()'
      break
    case 'uuid':
      definition += '.string().uuid()'
      break
    case 'text':
    case 'string':
      definition += '.string()'

      if (column.name.includes('email')) {
        definition += '.email()'
      }

      if (column.options[0] && typeof column.options[0] === 'number') {
        definition += `.maxLength(${column.options[0]})`
      }
      break
    case 'float':
    case 'decimal':
      definition += '.number()'
      if (
        column.options.length === 2 &&
        typeof column.options[0] === 'number' &&
        typeof column.options[1] === 'number'
      ) {
        definition += `.decimal([${column.options[0]}, ${column.options[1]}])`
      }
      break
    case 'boolean':
      definition += '.boolean()'
      break
    case 'date':
    case 'dateTime':
    case 'timestamp':
      definition += '.date()'
      break
    case 'time':
      definition += '.string().regex(timeRegex)'
      break
    case 'json':
    case 'jsonb':
    case 'binary':
      definition += '.any()'
      break
    case 'enu':
    case 'enum':
      if (Array.isArray(column.options[0])) {
        const enumValues = (column.options[0] as string[]).map((value) => `'${value}'`).join(', ')
        definition += `.enum([${enumValues}])`
      }
      break
    default:
      definition += '.any()'
  }

  if (!column.chain.some((item) => item.method === 'notNullable') || isUpdate) {
    definition += '.optional()'
  }

  return `  ${stringHelpers.camelCase(column.name)}: ${definition},`
}
