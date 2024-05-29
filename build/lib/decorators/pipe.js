export default function pipe(...items) {
    return function (_target, _propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (ctx) {
            let terminate = false;
            const pipeEnd = () => {
                terminate = true;
            };
            console.log({ _target: this });
            for (const item of items) {
                await item(ctx, pipeEnd);
                if (terminate) {
                    return;
                }
            }
            await originalMethod.apply(this, [ctx]);
        };
        return descriptor;
    };
}
