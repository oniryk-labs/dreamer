export default class CrudCreateUseCase {
    static async call(ctx, terminate) {
        ctx.pipeContext = ctx.pipeContext || [];
        ctx.pipeContext.push('create');
        terminate();
    }
}
