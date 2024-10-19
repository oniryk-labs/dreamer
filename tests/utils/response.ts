import type { HttpContext, Response } from '@adonisjs/core/http'
import { CrudVerb } from '../../src/extensions/crud.js'

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
  return new Promise((resolve, reject) => {
    try {
      interceptJsonResponse(context.response, (data) => {
        resolve(data)
      })

      // @ts-ignore
      verb(...args)(context)
    } catch (error) {
      reject(error)
    }
  })
}
