import { FileSystem } from '@japa/file-system'
import chokidar from 'chokidar'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

type TemplateOrContent =
  | { template: string; content?: never }
  | { content: string; template?: never }

export async function replaceContent(file: string, { template, content }: TemplateOrContent) {
  if (template) {
    await writeFile(file, await readFile(template))
    return
  }

  if (content) {
    await writeFile(file, content)
  }
}

export function watchFileOnce(filepath: string) {
  const watcher = chokidar.watch(filepath)

  return new Promise<void>((resolve) => {
    watcher.on('change', () => {
      console.log('File changed')
      watcher.close()
      resolve()
    })
  })
}

export async function getMostRecentFile(folder: string): Promise<string | null> {
  try {
    const files = await readdir(folder)

    if (files.length === 0) {
      return null
    }

    let mostRecent = null
    let mostRecentTime = 0

    for (const file of files) {
      const filePath = path.join(folder, file)
      const stats = await stat(filePath)

      if (stats.isFile() && stats.mtime.getTime() > mostRecentTime) {
        mostRecent = file
        mostRecentTime = stats.mtime.getTime()
      }
    }

    return mostRecent
  } catch (error) {
    console.error(`Error reading folder: ${error.message}`)
    return null
  }
}

export async function setupFakeAdonisProject(fs: FileSystem) {
  await Promise.all([
    fs.createJson('tsconfig.json', { compilerOptions: {} }),
    fs.create('adonisrc.ts', await readFile('./tests/templates/adonisrc.txt', 'utf-8')),
    fs.create('exceptions/handler.ts', await readFile('./tests/templates/handler.txt', 'utf-8')),
    fs.create('start/kernel.ts', await readFile('./tests/templates/kernel.txt', 'utf-8')),
    fs.create('start/env.ts', await readFile('./tests/templates/env.txt', 'utf-8')),
    fs.create('start/routes.ts', await readFile('./tests/templates/routes.txt', 'utf-8')),
  ])
}

export async function setupNpm(fs: FileSystem) {
  await Promise.all([
    fs.create('package.json', await readFile('./tests/templates/package.txt', 'utf-8')),
    fs.create('package-lock.json', await readFile('./tests/templates/package-lock.txt', 'utf-8')),
  ])
}

export async function cleanNpm(fs: FileSystem) {
  await Promise.all([fs.remove('package.json'), fs.remove('package-lock.json')])
}
