import { SyntaxKind, Node } from 'ts-morph'

export function getLiteralValue(node: Node): any {
  switch (node.getKind()) {
    case SyntaxKind.StringLiteral:
      return node.asKind(SyntaxKind.StringLiteral)!.getLiteralValue()
    case SyntaxKind.NumericLiteral:
      return node.asKind(SyntaxKind.NumericLiteral)!.getLiteralValue()
    case SyntaxKind.TrueKeyword:
    case SyntaxKind.FalseKeyword:
      return node.getText() === 'true'
    case SyntaxKind.NullKeyword:
      return null
    case SyntaxKind.ArrayLiteralExpression:
      return node
        .asKindOrThrow(SyntaxKind.ArrayLiteralExpression)
        .getElements()
        .map((element) => getLiteralValue(element))
    case SyntaxKind.ObjectLiteralExpression:
      return node
        .asKindOrThrow(SyntaxKind.ObjectLiteralExpression)
        .getProperties()
        .reduce((result, attr) => {
          const prop = attr.asKindOrThrow(SyntaxKind.PropertyAssignment)
          result[prop.getName()] = getLiteralValue(prop.getInitializerOrThrow())
          return result
        }, {} as any)
    default:
      return { unsupported: node.getText() }
  }
}
