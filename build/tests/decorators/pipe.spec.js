var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { test } from '@japa/runner';
import pipe from '../../lib/decorators/pipe.js';
import CrudCreateUseCase from '../../lib/use_cases/crud/crud_create_use_case.js';
const CrudShowUseCase = CrudCreateUseCase;
const AddItem = async (ctx, _terminate) => {
    ctx.pipeContext = ctx.pipeContext || [];
    ctx.pipeContext.push('item');
};
// const AddAndTerminate: PipeFunction = async (ctx, _terminate) => {
//   ctx.pipeContext.push('item');
//   await _terminate();
// };
class TestController {
    async handle(_ctx) { }
}
__decorate([
    pipe(CrudShowUseCase.call),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], TestController.prototype, "handle", null);
test.group('Pipe Decorator', () => {
    test('should terminate pipe in the middle', async ({ assert }) => {
        const ctx = {};
        const controller = new TestController();
        await controller.handle(ctx);
        assert.equal(ctx.pipeContext?.length, 1);
    });
});
