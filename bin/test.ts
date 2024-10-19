import { assert } from '@japa/assert'
import { fileSystem } from '@japa/file-system'
import { configure, processCLIArgs, run } from '@japa/runner'
import { fileURLToPath } from 'node:url'
import { rm, access } from 'node:fs/promises'

const BASE_URL = new URL('../tmp/', import.meta.url)
const AUTO_CLEAN = ![...process.argv].includes('--keep-fs')

processCLIArgs(process.argv.splice(2))

configure({
  files: ['tests/**/*.spec.ts'],
  plugins: [assert(), fileSystem({ autoClean: false, basePath: fileURLToPath(BASE_URL) })],
  teardown: [
    async () => {
      const exists = await access(BASE_URL)
        .then(() => true)
        .catch(() => false)

      if (AUTO_CLEAN && exists) {
        await rm(fileURLToPath(BASE_URL), { recursive: true })
      }
    },
  ],
})

run()
