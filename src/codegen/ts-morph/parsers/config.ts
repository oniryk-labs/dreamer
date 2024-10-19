import { SourceFile, SyntaxKind, ObjectLiteralExpression } from 'ts-morph'
import { getLiteralValue } from './base.js'

export default class TSMorphConfigParser {
  constructor(private source: SourceFile) {}

  getConfig() {
    try {
      const defaultExport = this.source.getExportAssignment((exp) => exp.isExportEquals() === false)
      const exportExpression = defaultExport!.getExpression().getText()
      const configDeclaration = this.source.getVariableDeclarationOrThrow(exportExpression)
      const initializer = configDeclaration.getInitializerOrThrow()
      const args = initializer.asKindOrThrow(SyntaxKind.CallExpression).getArguments()[0]

      let props: unknown = []

      if (args.isKind(SyntaxKind.ObjectLiteralExpression)) {
        props = args.asKindOrThrow(SyntaxKind.ObjectLiteralExpression).getProperties()
      } else if (args.isKind(SyntaxKind.AsExpression)) {
        props = args
          .asKindOrThrow(SyntaxKind.AsExpression)
          .getExpression()
          .asKindOrThrow(SyntaxKind.ObjectLiteralExpression)
          .getProperties()
      }

      return (props as ObjectLiteralExpression[]).reduce((acc, cur) => {
        const prop = cur.asKindOrThrow(SyntaxKind.PropertyAssignment)
        const key = prop.getName()
        const value = getLiteralValue(prop.getInitializerOrThrow())
        return { ...acc, [key]: value }
      }, {} as any)
    } catch (error) {
      throw new Error('Unsupported config file format')
    }
  }
}
