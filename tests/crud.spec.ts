import { test } from '@japa/runner'
import { destroy, index, show, store, update } from '../src/extensions/crud.js'
import { pagination } from '../src/validator/pagination.js'
import { executeCrudVerb } from './utils/response.js'
import { createIgnitor, createTestUtils } from './utils/ignitor.js'
import { getUserModel, setupDatabase, USER_1_UUID, USER_2_UUID } from './utils/database.js'
import { TestContext } from '@japa/runner/core'
import { createRequestFor } from './utils/request.js'
import vine from '@vinejs/vine'
import { setupFakeAdonisProject } from './utils/fs.js'

type Context = TestContext & {
  ignitor?: ReturnType<typeof createIgnitor>
  utils?: Awaited<ReturnType<typeof createTestUtils>>
  User?: ReturnType<typeof getUserModel>
}

const validator = vine.compile(
  vine.object({
    fullName: vine.string().trim(),
    username: vine.string().trim(),
    email: vine.string().trim().email(),
  })
)

test.group('CRUD Extensions', (group) => {
  group.each.disableTimeout()

  group.each.setup(async ({ context }) => {
    setupFakeAdonisProject(context.fs)

    const ignitor = createIgnitor(context.fs, { withDatabase: true })
    const utils = await createTestUtils(ignitor, { autoInitialize: true })
    const ctx: Context = context satisfies Context

    ctx.ignitor = ignitor
    ctx.utils = utils
    ctx.User = getUserModel()
  })

  group.each.teardown(async ({ context }) => {
    const ctx: Context = context satisfies Context
    await ctx.ignitor?.terminate()
  })

  group.setup(async () => {
    await setupDatabase()
  })

  test('index: should return a paginated response', async ({ assert, utils, User }: Context) => {
    const context = await utils!.createHttpContext()
    context.request.__raw_files = {}

    const data = await executeCrudVerb(context, index, [User!, { validator: pagination }])

    assert.properties(data, ['data', 'meta', 'status'])
    assert.typeOf(data?.data, 'array')
    assert.typeOf(data?.meta, 'object')
    assert.properties(data?.meta, [
      'total',
      'perPage',
      'currentPage',
      'lastPage',
      'firstPage',
      'firstPageUrl',
      'lastPageUrl',
      'nextPageUrl',
      'previousPageUrl',
    ])
  })

  test('show: should return a single record', async ({ assert, utils, User }: Context) => {
    const context = await utils!.createHttpContext({
      req: createRequestFor(`/users/${USER_1_UUID}`),
    })

    context.request.__raw_files = {}
    context.params = { id: USER_1_UUID }

    const data = await executeCrudVerb(context, show, [User!])
    const user = await User!.query().where('uuid', USER_1_UUID).firstOrFail()

    assert.equal(data?.status, 'success')
    assert.property(data, 'data')
    assert.deepEqual(data?.data, user.toJSON())
  })

  test('store: should create a new record', async ({ assert, utils, User }: Context) => {
    const context = await utils!.createHttpContext({
      req: createRequestFor('/users'),
    })

    context.request.__raw_files = {}
    context.request.setInitialBody({
      fullName: 'morpheus',
      username: 'morpheus',
      email: 'morpheus@oniryk.dev',
    })

    const data = await executeCrudVerb(context, store, [User!, validator])

    assert.equal(data?.status, 'success')
    assert.property(data, 'data')
    assert.properties(data?.data, ['uuid', 'fullName', 'username', 'email'])

    const user = await User!.query().where('uuid', data?.data.uuid).first()

    assert.isNotNull(user)

    assert.equal(data?.data.fullName, 'morpheus')
    assert.equal(data?.data.username, 'morpheus')
    assert.equal(data?.data.email, 'morpheus@oniryk.dev')
  })

  test('store: should return an error if the validation fails', async ({
    assert,
    utils,
    User,
  }: Context) => {
    const context = await utils!.createHttpContext({
      req: createRequestFor('/users'),
    })

    context.request.__raw_files = {}
    context.request.setInitialBody({})

    const data = await executeCrudVerb(context, store, [User!, validator])

    assert.equal(data?.status, 'error')
  })

  test('update: should update a record', async ({ assert, utils, User }: Context) => {
    const context = await utils!.createHttpContext({
      req: createRequestFor(`/users/${USER_2_UUID}`),
    })

    context.request.__raw_files = {}
    context.params = { id: USER_2_UUID }
    context.request.setInitialBody({
      fullName: 'nightmare_edit',
      username: 'nightmare_edit',
      email: 'nightmare_edit@oniryk.dev',
    })

    const data = await executeCrudVerb(context, update, [User!, validator])

    assert.equal(data?.status, 'success')
    assert.property(data, 'data')
    assert.properties(data?.data, ['uuid', 'fullName', 'username', 'email'])

    assert.equal(data?.data.uuid, USER_2_UUID)
    assert.equal(data?.data.fullName, 'nightmare_edit')
    assert.equal(data?.data.username, 'nightmare_edit')
    assert.equal(data?.data.email, 'nightmare_edit@oniryk.dev')

    const user = await User!.query().where('uuid', USER_2_UUID).firstOrFail()

    assert.equal(user.fullName, 'nightmare_edit')
    assert.equal(user.username, 'nightmare_edit')
    assert.equal(user.email, 'nightmare_edit@oniryk.dev')
  })

  test('destroy: should delete a record', async ({ assert, utils, User }: Context) => {
    const context = await utils!.createHttpContext({
      req: createRequestFor(`/users/${USER_1_UUID}`),
    })

    context.request.__raw_files = {}
    context.params = { id: USER_1_UUID }

    const data = await executeCrudVerb(context, destroy, [User!])
    assert.equal(data?.status, 'success')

    const user = await User!.query().where('uuid', USER_1_UUID).first()
    assert.isNull(user)
  })
})
