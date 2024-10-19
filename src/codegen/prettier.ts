import { readFile, writeFile } from 'node:fs/promises'
import type { Options } from 'prettier'

// May not the better way to do this, but it works for now
// TODO: Find a way import from @adonisjs/prettier-config
const prettyConfig: Options = {
  parser: 'typescript',
  trailingComma: 'es5',
  semi: false,
  singleQuote: true,
  useTabs: false,
  quoteProps: 'consistent',
  bracketSpacing: true,
  arrowParens: 'always',
  printWidth: 100,
}

const getPrettier = async () => {
  try {
    return await import('prettier')
  } catch {
    return null
  }
}

export async function prettify(filepaths: string[]) {
  const prettier = (await getPrettier())!

  for (const filepath of filepaths) {
    const content = await readFile(filepath, 'utf8')
    const formatted = await prettier.format(content, prettyConfig)
    await writeFile(filepath, formatted)
  }
}
