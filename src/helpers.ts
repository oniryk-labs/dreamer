import { BaseCommand } from '@adonisjs/core/ace'

export const pipe =
  <T extends any[], R>(...fns: [...{ [K in keyof T]: (arg: any) => any }, (...args: T) => R]) =>
  (x: T[0]): R =>
    fns.reduce((v, f) => f(v), x as any)

export const waitWithAnimation = async (
  logger: BaseCommand['logger'],
  fn: () => Promise<void>,
  message: string
) => {
  const animation = logger.await(message)
  animation.start()
  await fn()
  animation.stop()
}

export function dd(...args: any[]) {
  console.log(...args)
  process.exit(1)
}
