import { test } from '@japa/runner'
import { defineConfig } from '../define_configs.js'

test('define config', ({ assert }) => {
  const config = defineConfig({
    useUUID: true,
    useSoftDelete: true,
  })

  assert.deepEqual(config, {
    useUUID: true,
    useSoftDelete: true,
  })
})
