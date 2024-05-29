import { test } from '@japa/runner';
import type { HttpContext } from '@adonisjs/core/http';
import pipe from '../../lib/decorators/pipe.js';
import { PipeFunction } from '../../lib/contracts/pipe_contexts.js';

const AddItem: PipeFunction = async (ctx: HttpContext) => {
  ctx.pipe!.context.added = true;
};

const AddItemAndTerminate: PipeFunction = async (ctx: HttpContext) => {
  ctx.pipe!.context.added = true;
  ctx.pipe!.interrupt();
};

class TestController {
  @pipe(AddItem)
  async handle(_ctx: HttpContext) {}
}

class TestController2 {
  @pipe(AddItemAndTerminate)
  async handle(ctx: HttpContext) {
    ctx.pipe!.context.finished = true;
  }
}

class TestController3 {
  @pipe(AddItem)
  async handle(ctx: HttpContext) {
    ctx.pipe!.context.finished = true;
  }
}

test.group('pipe decorator', () => {
  test('should execute and change the context', async ({ assert }) => {
    const ctx = {} as HttpContext;
    const controller = new TestController();
    await controller.handle(ctx);

    assert.equal(ctx.pipe!.context.added, true);
  });

  test('should execute and interrupt', async ({ assert }) => {
    const ctx = {} as HttpContext;
    const controller = new TestController2();
    await controller.handle(ctx);

    assert.equal(ctx.pipe!.context.added, true);
    assert.equal(ctx.pipe!.context.finished, undefined);
  });

  test('should execute all pipe functions and the controller action', async ({
    assert,
  }) => {
    const ctx = {} as HttpContext;
    const controller = new TestController3();
    await controller.handle(ctx);

    assert.equal(ctx.pipe!.context.added, true);
    assert.equal(ctx.pipe!.context.finished, true);
  });
});
