import type { NamingRules } from './naming.js'

export type ControllerAction = 'index' | 'show' | 'store' | 'update' | 'destroy'
export type ControllerModel = { name: string; path: string }

export function generateController({
  model,
  validator,
  controller,
  actions,
  formatters,
}: Pick<NamingRules, 'model' | 'validator' | 'controller'> & {
  actions: ControllerAction[]
  formatters: string[]
}) {
  const methods: string[] = []
  const imports: string[] = [model.import]

  if (actions.length) {
    imports.push(`import { ${actions.join(', ')} } from '@oniryk/dreamer/extensions/crud'`)

    if (actions.includes('store') && actions.includes('update')) {
      imports.push(validator.import.both)
    } else if (actions.includes('store')) {
      imports.push(validator.import.create)
    } else if (actions.includes('update')) {
      imports.push(validator.import.update)
    }
  }

  if (formatters.length) {
    for (const formatter of formatters) {
      imports.push(`import ${formatter} from '@oniryk/dreamer-${formatter}'`)
    }
  }

  const indexParams = formatters.length
    ? `, { formats: [${formatters.map((f) => `${f}()`).join(', ')}] }`
    : ''

  actions.forEach((action) => {
    switch (action) {
      case 'index':
        methods.push(`  public index = index(${model.name}${indexParams})`)
        break
      case 'show':
        methods.push(`  public show = show(${model.name})`)
        break
      case 'store':
        methods.push(`  public store = store(${model.name}, ${validator.create})`)
        break
      case 'update':
        methods.push(`  public update = update(${model.name}, ${validator.update})`)
        break
      case 'destroy':
        methods.push(`  public destroy = destroy(${model.name})`)
        break
    }
  })

  return `${imports.join('\n')}

export default class ${controller.name} {
${methods.join('\n')}
}
  `
}
