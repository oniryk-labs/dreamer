import vine from '@vinejs/vine'

export const pagination = vine.compile(
  vine.object({
    page: vine.number().optional(),
  })
)
