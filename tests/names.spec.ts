import { test } from '@japa/runner'
import { generateNaming } from '../src/codegen/naming.js'

test.group('Names and Paths', () => {
  test('should generate correct naming structure', ({ assert }) => {
    const result = generateNaming('Users/posts')

    assert.deepEqual(result, {
      migration: { file: result?.migration?.file, table: 'posts' },
      controller: {
        name: 'PostsController',
        file: 'users/posts_controller.ts',
        import: "import PostsController from '#controllers/users/post'",
      },
      model: {
        name: 'Post',
        file: 'users/post.ts',
        import: "import Post from '#models/users/post'",
      },
      validator: {
        create: 'validatePostCreate',
        update: 'validatePostUpdate',
        file: 'users/post.ts',
        import: {
          create: "import { validatePostCreate } from '#validators/users/post'",
          update: "import { validatePostUpdate } from '#validators/users/post'",
          both: "import { validatePostCreate, validatePostUpdate } from '#validators/users/post'",
        },
      },
      route: {
        base: 'posts',
        prefix: 'users',
        prefixParam: ':user_id',
        file: 'routes/users/post.ts',
        import: './routes/users/post.js',
        controller: "const PostsController = () => import('#controllers/users/posts_controller')",
      },
    })
  })
})
