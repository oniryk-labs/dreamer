import { SourceFile } from 'ts-morph'

export const AUTOSAVE_OFF = false

export function addImportIfNotExists({
  sourceFile,
  moduleSpecifier,
  importName,
  alias,
  autoSave = true,
}: {
  sourceFile: SourceFile
  moduleSpecifier: string
  importName?: string
  alias?: string
  autoSave?: boolean
}) {
  const existingImport = sourceFile.getImportDeclaration(
    (importDecl) => importDecl.getModuleSpecifierValue() === moduleSpecifier
  )

  if (existingImport) {
    if (importName) {
      const namedImports = existingImport.getNamedImports()
      const existingImportSpecifier = namedImports.find((namedImport) => {
        if (alias) {
          return namedImport.getAliasNode()?.getText() === alias
        } else {
          return namedImport.getName() === importName
        }
      })

      if (!existingImportSpecifier) {
        if (alias) {
          existingImport.addNamedImport({ name: importName, alias: alias })
        } else {
          existingImport.addNamedImport(importName)
        }
      }
    }
  } else {
    if (importName) {
      sourceFile.addImportDeclaration({
        moduleSpecifier: moduleSpecifier,
        namedImports: alias ? [{ name: importName, alias: alias }] : [importName],
      })
    } else {
      sourceFile.addImportDeclaration({
        moduleSpecifier: moduleSpecifier,
      })
    }
  }

  if (autoSave) {
    sourceFile.saveSync()
  }
}
