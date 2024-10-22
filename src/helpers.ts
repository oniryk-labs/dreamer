import { BaseCommand } from '@adonisjs/core/ace'
import colors from '@poppinss/colors'

export const pipe =
  <T extends any[], R>(...fns: [...{ [K in keyof T]: (arg: any) => any }, (...args: T) => R]) =>
  (x: T[0]): R =>
    fns.reduce((v, f) => f(v), x as any)

export const waitWithAnimation = async ({
  logger,
  message,
  action,
}: {
  logger: BaseCommand['logger']
  message: string
  action: () => Promise<void>
}) => {
  const animation = logger.await(message)
  animation.start()
  await action()
  animation.stop()
}

export function dd(arg: any) {
  console.dir(arg, { depth: Number.POSITIVE_INFINITY })
  process.exit(1)
}

export function lg(...args: any[]) {
  const cwd = process.cwd()
  const stack = new Error().stack!
  const callerLine = stack.split('\n')[2]
  const match = callerLine.match(/\((.*):(\d+):(\d+)\)$/)

  if (match) {
    const [, file, line] = match
    const relativeFile = file.replace(cwd, '.')
    console.log(colors.ansi().gray(`\nconsole.log @ ${relativeFile}:${line} :: ====`))
  }

  console.log(...args)
  console.log(colors.ansi().gray(`==== ::\n`))
}
