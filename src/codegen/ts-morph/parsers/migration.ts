import {
  SourceFile,
  SyntaxKind,
  CallExpression,
  ClassDeclaration,
  ArrowFunction,
  Node,
} from 'ts-morph'
import { getLiteralValue } from './base.js'

export interface ColumnDefinition {
  name: string
  type: string
  chain: { method: string; args: any[] }[]
  options: unknown[]
}

export interface TableStructure {
  table: string
  columns: ColumnDefinition[]
}

export default class TSMorphMigrationParser {
  classDeclaration: ClassDeclaration

  constructor(source: SourceFile) {
    this.classDeclaration = source.getClasses()[0]
  }

  extractTableName() {
    return this.classDeclaration
      .getPropertyOrThrow('tableName')
      .getInitializerOrThrow()
      .getText()
      .replace(/["']/g, '')
  }

  extractTableStructure(): TableStructure {
    const columns: ColumnDefinition[] = []

    const createTableCall = this.classDeclaration
      .getMethodOrThrow('up')
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .find((call) => call.getExpression().getText() === 'this.schema.createTable')

    const tableBody = (createTableCall!.getArguments()[1]! as ArrowFunction).getBody()

    if (Node.isBlock(tableBody)) {
      tableBody.getStatements().forEach((statement) => {
        if (Node.isExpressionStatement(statement)) {
          let expression: CallExpression = statement.getExpression()! as CallExpression
          let stack: any[] = []

          while (Node.isCallExpression(expression)) {
            // get Identifier
            const identifier = expression
              .getExpression()
              .asKind(SyntaxKind.PropertyAccessExpression)!
              .getName()

            const args = expression.getArguments().map((arg) => {
              return getLiteralValue(arg)
            })

            stack.push({
              method: identifier,
              args,
            })

            expression = expression
              .getExpression()
              .asKind(SyntaxKind.PropertyAccessExpression)!
              .getExpression()
              .asKind(SyntaxKind.CallExpression)!
          }

          const [type, ...chain] = stack.reverse()
          const [name, ...opts] = type.args

          if (type.method === 'timestamps') {
            ;['created_at', 'updated_at'].forEach((field) => {
              columns.push({
                name: field,
                type: 'timestamp',
                chain,
                options: type.args,
              })
            })

            return
          }

          columns.push({
            name,
            type: type.method,
            chain,
            options: opts,
          })
        }
      })
    }

    return {
      table: this.extractTableName(),
      columns,
    }
  }
}
