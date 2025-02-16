import { Exception } from '@adonisjs/core/exceptions'
import type { Response } from '@adonisjs/core/http'

export type SuccessResponseCode = 200 | 201 | 202 | 204
export type ErrorResponseCode = 400 | 401 | 403 | 404 | 409 | 422 | 500

export async function success(
  response: Response,
  data: any = null,
  statusCode: SuccessResponseCode = 200
) {
  if (data?.constructor?.name === 'ModelPaginator') {
    const users = data.serialize()

    return response.status(statusCode).json({
      status: 'success',
      data: users.data,
      meta: users.meta,
    })
  }

  return response.status(statusCode).json({
    status: 'success',
    data,
  })
}

export function error(
  response: Response,
  originError: Error | { code: string; message: string },
  statusCode: ErrorResponseCode = 500
) {
  const err = originError as any
  const status = typeof (err as any).status === 'number' ? err.status : statusCode

  if (err.constructor.name === 'ValidationError') {
    return response.status(err.status).json({
      status: 'error',
      error: {
        code: 'E_VALIDATION_ERROR',
        issues: err.messages.map((issue: any) => ({
          issue: `${issue.rule}:${issue.field}`,
          message: issue.message,
          meta: issue.meta,
        })),
      },
    })
  }

  return response.status(status).json({
    status: 'error',
    error: {
      code: err instanceof Exception ? err.code : (err as any).code || (err as any).name,
      message: err.message,
    },
  })
}
