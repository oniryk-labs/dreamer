import { Codemods } from '@adonisjs/core/ace/codemods'
import { stubsRoot } from '../../stubs/main.js'
import { prettify } from './prettier.js'

export default class StubRenderer {
  constructor(private codemods: Codemods) {}

  async render(name: string, state: Record<string, any>) {
    const { destination } = await this.codemods.makeUsingStub(stubsRoot, name, state)
    const file = destination?.to || destination || ''

    if (file && file.endsWith('.ts')) {
      await prettify([file])
    }
  }
}
