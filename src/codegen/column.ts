import stringHelpers from '@adonisjs/core/helpers/string'
import { DreamerConfig } from '../../types.js'

interface ColumnDefinition {
  name: string
  type: string
  chain: { method: string; args: any[] }[]
  options: any[]
}

interface RenderResult {
  content: string
  needsEasyEnumImport: boolean
  needsDateTimeImport: boolean
}

export function renderColumnDefinitions(
  modelName: string,
  config: DreamerConfig,
  columns: ColumnDefinition[]
): RenderResult {
  let enumDefinitions = ''
  let columnDefinitions: string[] = []
  let needsEasyEnumImport = false
  let needsDateTimeImport = false

  const enums = columns.filter((col) => col.type === 'enu' || col.type === 'enum')

  if (enums.length > 0) {
    needsEasyEnumImport = true
    enumDefinitions = `static get enums() {
    return {
${enums
  .map((col) => {
    const enumValues = col.options[0] as string[]
    const enumName = stringHelpers.pascalCase(col.name)
    return `      ${enumName}: enu(${enumValues.map((v) => `'${v}'`).join(', ')}),`
  })
  .join('\n')}
    }
  }

`
  }

  columns.forEach((column) => {
    let decoratorString = '@column'
    let type = getTypeScriptType(column.type)
    const decoratorOptions: string[] = []

    // Handle primary key
    if (column.name === 'id' && column.type === 'increments') {
      if (config.useUUID) {
        return
      }

      decoratorOptions.push('isPrimary: true')
    }

    // Handle UUID primary key
    if (column.name === 'uuid' && (column.type === 'uuid' || column.type === 'string')) {
      if (config.useUUID) {
        return
      }
    }

    if (column.name.endsWith('_id') && config.useUUID) {
      decoratorOptions.push('serializeAs: null')
    }

    // Handle DateTime columns
    if (column.type === 'dateTime' || column.type === 'timestamp') {
      decoratorString = '@column.dateTime'
      type = 'DateTime'

      if (
        config.useSoftDelete &&
        ['created_at', 'updated_at', 'deleted_at'].includes(column.name)
      ) {
        return
      }

      needsDateTimeImport = true

      if (column.options.includes(true)) {
        if (column.name === 'created_at') {
          decoratorOptions.push('autoCreate: true')
        } else if (column.name === 'updated_at') {
          decoratorOptions.push('autoCreate: true, autoUpdate: true')
        } else if (column.name === 'deleted_at') {
          decoratorOptions.push('serializeAs: null')
        }
      }
    }

    // Handle password columns
    if (column.name === 'password' && column.type === 'string') {
      console.log('[warn] password column detected. its will be serialized as null')
      console.log('       to avoid leaking passwords in the response')
      console.log('       may you need to auto hash the password before saving it')
      decoratorOptions.push('serializeAs: null')
    }

    // Handle nullable
    if (column.chain.some((c) => c.method === 'nullable')) {
      type += ' | null'
    }

    // Handle enums
    if (column.type === 'enu' || column.type === 'enum') {
      const enumName = stringHelpers.pascalCase(column.name)
      type = `InferEnum<typeof ${modelName}.enums.${enumName}>`
      needsEasyEnumImport = true
    }

    // Construct final decorator string
    if (decoratorOptions.length > 0) {
      decoratorString += `({ ${decoratorOptions.join(', ')} })`
    } else {
      decoratorString += '()'
    }

    // Add the column definition
    columnDefinitions.push(
      `  ${decoratorString}\n  declare ${stringHelpers.camelCase(column.name)}: ${type}`
    )
  })

  return {
    content: enumDefinitions + columnDefinitions.join('\n\n'),
    needsEasyEnumImport,
    needsDateTimeImport,
  }
}

function getTypeScriptType(sqlType: string): string {
  const typeMap: { [key: string]: string } = {
    increments: 'number',
    integer: 'number',
    bigInteger: 'number',
    text: 'string',
    string: 'string',
    float: 'number',
    decimal: 'number',
    boolean: 'boolean',
    date: 'DateTime',
    dateTime: 'DateTime',
    time: 'string',
    timestamp: 'DateTime',
    binary: 'Buffer',
    json: 'any',
    jsonb: 'any',
    uuid: 'string',
    enum: 'string',
    enu: 'string',
  }

  return typeMap[sqlType] || 'any'
}
