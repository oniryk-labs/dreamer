import { DreamerConfig } from '../../types.js'
import { ControllerAction } from './controller.js'
import { generateNaming } from './naming.js'

export type UnsupportedActions = Exclude<string, ControllerAction>

export type RouteStubContent = {
  deps: string
  routes: string
  matchers: string
  prefix: string
  file: string
  imports: string
}

export function generateRoutes({
  entity,
  configs,
  actions,
}: {
  entity: string
  configs: DreamerConfig
  actions: ControllerAction[]
}): RouteStubContent {
  const { route, controller } = generateNaming(entity)

  const actionCalls = actions.map((action) => {
    const path = route.prefix ? `/${route.prefixParam}/${route.base}` : route.base

    switch (action) {
      case 'index':
        return `router.get('${path}', [${controller.name}, 'index'])`
      case 'show':
        return `router.get('${path}/:id', [${controller.name}, 'show'])`
      case 'store':
        return `router.post('${path}', [${controller.name}, 'store'])`
      case 'update':
        return `router.put('${path}/:id', [${controller.name}, 'update'])`
      case 'destroy':
        return `router.delete('${path}/:id', [${controller.name}, 'destroy'])`
    }
  })

  const matchers = [`.where('id', router.matchers.${configs.useUUID ? 'uuid' : 'number'}())`]

  if (route.prefix) {
    const param = route.prefixParam?.replace(':', '')
    matchers.push(`.where('${param}', router.matchers.${configs.useUUID ? 'uuid' : 'number'}())`)
  }

  return {
    deps: route.controller,
    routes: actionCalls.map((c) => `    ${c}`).join('\n'),
    matchers: matchers.map((c) => `  ${c}`).join('\n'),
    prefix: route.prefix ? `.prefix('${route.prefix}')` : '',
    file: route.file,
    imports: route.import,
  }
}

export const normalizeActions = (actions: string[]): [ControllerAction[], UnsupportedActions[]] => {
  const items: string[] = actions.reduce(
    (acc, cur) => [...acc, ...cur.split(',').filter(Boolean)],
    [] as string[]
  )

  const base = ['index', 'show', 'store', 'update', 'destroy']

  return [
    items.filter((item) => base.includes(item)) as ControllerAction[],
    items.filter((item) => !base.includes(item)) as UnsupportedActions[],
  ]
}
