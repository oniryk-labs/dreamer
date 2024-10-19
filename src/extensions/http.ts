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
  if (originError.constructor.name === 'ValidationError') {
    return response.status((originError as any).status).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: originError.message,
        errors: (originError as any).messages,
      },
    })
  }

  return response.status(statusCode).json({
    status: 'error',
    error: {
      code: originError instanceof Error ? originError.name : originError.code,
      message: originError.message,
    },
  })
}
