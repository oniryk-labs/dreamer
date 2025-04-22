import type { HttpContext, Response } from '@adonisjs/core/http'
import { CrudVerb } from '../../src/extensions/crud.js'
import { error } from '../../src/extensions/http.js'

export function interceptJsonResponse(response: Response, onJson: (data: unknown) => void) {
  const originalJson = response.json.bind(response)

  response.json = (data: unknown) => {
    onJson(data)
    return originalJson(data)
  }
}

export function executeCrudVerb<V extends CrudVerb, A extends Parameters<V>>(
  context: HttpContext,
  verb: V,
  args: A
): Promise<any> {
  return new Promise((resolve) => {
    interceptJsonResponse(context.response, resolve)
    ;(verb as any)(...args)(context).catch((err: any) => error(context.response, err))
  })
}
