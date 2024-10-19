import { SourceFile } from 'ts-morph'
import { addImportIfNotExists, AUTOSAVE_OFF } from './imports.js'

export function changeDefaultExceptionHandler(source: SourceFile) {
  addImportIfNotExists(source, '@oniryk/dreamer/extensions/http', 'error as errorFn', AUTOSAVE_OFF)
  const handleMethod = source.getClassOrThrow('HttpExceptionHandler').getMethodOrThrow('handle')

  handleMethod.setBodyText('return errorFn(ctx.response, error as Error)')
  source.saveSync()
}
