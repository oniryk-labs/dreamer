import { SourceFile } from 'ts-morph'

export const AUTOSAVE_OFF = false

export function addImportIfNotExists(
  sourceFile: SourceFile,
  moduleSpecifier: string,
  importName?: string,
  autoSave: boolean = true
) {
  const existingImport = sourceFile.getImportDeclaration(
    (importDecl) => importDecl.getModuleSpecifierValue() === moduleSpecifier
  )

  if (existingImport) {
    if (importName) {
      const namedImports = existingImport.getNamedImports()
      const hasNamedImport = namedImports.some(
        (namedImport) => namedImport.getName() === importName
      )

      if (!hasNamedImport) {
        existingImport.addNamedImport(importName)
      }
    }
    // If importName is not provided, we don't need to do anything
    // as the import already exists
  } else {
    if (importName) {
      sourceFile.addImportDeclaration({
        moduleSpecifier: moduleSpecifier,
        namedImports: [importName],
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

// Usage examples:
// addImportIfNotExists(sourceFile, "react", "useState");
// addImportIfNotExists(sourceFile, "./files.js");
