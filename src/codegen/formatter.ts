import { BaseCommand } from '@adonisjs/core/ace'
import { isPackageInstalled } from '../package.js'
import { Codemods } from '@adonisjs/core/ace/codemods'

const supportedFormats = () => [
  {
    name: 'csv',
    message: 'csv (using: @oniryk/dreamer-csv)',
    package: '@oniryk/dreamer-csv',
  },
  {
    name: 'xls',
    message: 'xlsx (using: @oniryk/dreamer-xls)',
    package: '@oniryk/dreamer-xls',
  },
]

export type Formatter = 'csv' | 'xls'

export async function pickAndInstallFormatter(command: BaseCommand, codemods?: Codemods) {
  const useFormats = await command.prompt.confirm(
    'would you like to add custom formats to "index" response (ex: csv, xls)'
  )

  if (!useFormats) {
    return []
  }

  const formats = await command.prompt.multiple('select formats to add', supportedFormats())
  const selected = supportedFormats().filter((format) => formats.includes(format.name))

  if (!selected.length) {
    return []
  }

  const { installed, pending } = await isPackageInstalled(
    command.app.makePath(),
    ...selected.map(({ package: pkg }) => pkg)
  )

  if (installed) {
    return selected.map((c) => c.name) as Formatter[]
  }

  const shouldInstall = await command.prompt.confirm(
    `the following packages are not installed: ${pending.join(', ')}. Would you like to install them?`,
    { default: true }
  )

  if (shouldInstall) {
    const mod = codemods || (await command.createCodemods())
    await mod.installPackages(pending.map((pkg) => ({ name: pkg, isDevDependency: false })))
  }

  return selected.map((c) => c.name) as Formatter[]
}
