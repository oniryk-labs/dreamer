import { SourceFile } from 'ts-morph'
import { addImportIfNotExists } from './imports.js'

export function changeDefaultExceptionHandler(source: SourceFile) {
  addImportIfNotExists({
    sourceFile: source,
    moduleSpecifier: '@oniryk/dreamer/extensions/http',
    importName: 'error',
    alias: 'errorFn',
    autoSave: true,
  })
  const handleMethod = source.getClassOrThrow('HttpExceptionHandler').getMethodOrThrow('handle')

  handleMethod.setBodyText('return errorFn(ctx.response, error as Error)')
  source.saveSync()
}
