import h from '@adonisjs/core/helpers/string'
import { pipe } from '../helpers.js'

const join = (...parts: string[]) => parts.filter(Boolean).join('/')

export function generateNaming(entity: string) {
  const pieces = entity.split('/')
  const name = pipe(h.singular, h.pascalCase)(pieces[pieces.length - 1])
  const folder = pieces.slice(0, -1).join('/').toLowerCase()

  return {
    migration: {
      file: `${Date.now()}_create_${pipe(h.plural, h.snakeCase)(name)}_table.ts`,
      table: pipe(h.plural, h.snakeCase)(name),
    },

    controller: {
      name: `${h.plural(name)}Controller`,
      file: join(folder, `${pipe(h.plural, h.snakeCase)(name)}_controller.ts`),
      import: `import ${h.plural(name)}Controller from '#controllers/${join(folder, h.snakeCase(name))}'`,
    },

    model: {
      name,
      file: join(folder, `${h.snakeCase(name)}.ts`),
      import: `import ${name} from '#models/${join(folder, h.snakeCase(name))}'`,
    },

    validator: {
      create: `validate${name}Create`,
      update: `validate${name}Update`,

      file: join(folder, `${h.snakeCase(name)}.ts`),
      import: {
        create: `import { validate${name}Create } from '#validators/${join(folder, h.snakeCase(name))}'`,
        update: `import { validate${name}Update } from '#validators/${join(folder, h.snakeCase(name))}'`,
        both: `import { validate${name}Create, validate${name}Update } from '#validators/${join(folder, h.snakeCase(name))}'`,
      },
    },

    route: {
      base: pipe(h.plural, h.snakeCase)(name),
      prefix: h.plural(folder) || null,
      prefixParam: h.plural(folder) ? `:${h.singular(folder)}_id` : null,
      file: `routes/${join(folder, h.snakeCase(name))}.ts`,
      import: `./routes/${join(folder, h.snakeCase(name))}.js`,
      controller: `const ${h.plural(name)}Controller = () => import('#controllers/${join(folder, `${pipe(h.plural, h.snakeCase)(name)}_controller`)}')`,
    },
  }
}

export type NamingRules = ReturnType<typeof generateNaming>
