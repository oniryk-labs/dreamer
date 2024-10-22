import { readFile } from 'node:fs/promises'
import path from 'node:path'

export async function isPackageInstalled(appRoot: string, ...packages: string[]) {
  const rawPackageJson = await readFile(path.join(appRoot, 'package.json'), 'utf-8')
  const packageJson = JSON.parse(rawPackageJson)
  const notInstalledPackages: string[] = []

  for (const pkg of packages) {
    const allDeps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) }

    if (!allDeps[pkg]) {
      notInstalledPackages.push(pkg)
    }
  }

  return {
    installed: notInstalledPackages.length === 0,
    pending: notInstalledPackages,
  }
}

export async function getPackageName(appRoot: string) {
  const rawPackageJson = await readFile(path.join(appRoot, 'package.json'), 'utf-8')
  const packageJson = JSON.parse(rawPackageJson)
  return packageJson.name as string
}
