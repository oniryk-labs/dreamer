export function useModel(m) {
    return function (ctor) {
        return class extends ctor {
            $model = m;
            constructor(...args) {
                super(...args);
            }
        };
    };
}
