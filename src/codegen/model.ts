import { TableStructure } from './ts-morph/parsers/migration.js'
import { renderColumnDefinitions } from './column.js'
import { DreamerConfig } from '../../types.js'
import { generateNaming } from './naming.js'

export function generateModel(entity: string, config: DreamerConfig, { columns }: TableStructure) {
  const opts = {
    useUUID: true,
    useSoftDelete: true,
  }

  const { model } = generateNaming(entity)
  const imports: string[] = []
  let extend = 'BaseModel'

  if (opts.useUUID || opts.useSoftDelete) {
    const items: string[] = []
    imports.push("import { compose } from '@adonisjs/core/helpers'")

    if (opts.useUUID) {
      items.push('withUUID')
    }

    if (opts.useSoftDelete) {
      items.push('withSoftDelete')
    }

    imports.push(`import { ${items.join(', ')} } from '@oniryk/dreamer/extensions/lucid'`)
    extend = `compose(BaseModel, ${items.map((c) => `${c}()`).join(', ')})`
  }

  const { content, needsEasyEnumImport, needsDateTimeImport } = renderColumnDefinitions(
    model.name,
    config,
    columns
  )

  if (needsEasyEnumImport) {
    imports.push("import { enu } from '@weedoit/easyenum'")
    imports.push("import type { InferEnum } from '@weedoit/easyenum'")
  }

  if (needsDateTimeImport) {
    imports.push("import { DateTime } from 'luxon'")
  }

  return {
    opts,
    imports: '\n' + imports.join('\n'),
    columns: content,
    extend: extend,
  }
}
