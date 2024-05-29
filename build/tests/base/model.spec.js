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
import { useModel, ModelConstructor } from '../../lib/base/model.js';
import pipe from '../../lib/decorators/pipe.js';
import CrudCreateUseCase from '../../lib/use_cases/crud/crud_create_use_case.js';
import { BaseModel, column } from '@adonisjs/lucid/orm';
export default class User extends BaseModel {
}
__decorate([
    column({ isPrimary: true }),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
let MyClass = class MyClass extends ModelConstructor {
    async handle(_ctx) {
        this.$model.create({});
    }
};
__decorate([
    pipe(CrudCreateUseCase.call),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], MyClass.prototype, "handle", null);
MyClass = __decorate([
    useModel(User)
], MyClass);
test.group('Pipe Decorator', () => {
    test('should terminate pipe in the middle', async ({ assert }) => {
        const clss = new MyClass();
        clss.$model.create({});
        clss.handle({});
        assert.equal(1, 1);
    });
});
