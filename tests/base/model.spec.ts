// import { test } from '@japa/runner';
// import { UseModelDecorated, useModel } from '../../lib/base/model.js';
// import pipe from '../../lib/decorators/pipe.js';
// import CrudCreateUseCase from '../../lib/use_cases/crud/crud_create_use_case.js';

// import type { HttpContext } from '@adonisjs/core/http';

// import { BaseModel, column } from '@adonisjs/lucid/orm';

// export default class User extends BaseModel {
//   @column({ isPrimary: true })
//   declare id: number;
// }

// // @useModel(User)
// // class MyClass extends UseModelDecorated<typeof User> {
// //   @pipe(CrudCreateUseCase)
// //   async handle(_ctx: HttpContext) {
// //     this.$model.create({});
// //   }
// // }

// test.group('Pipe Decorator', () => {
//   test('should terminate pipe in the middle', async ({ assert }) => {
//     // const clss = new MyClass();

//     // const user = new clss.$model();

//     // user.id = 1;

//     // console.log(user.toJSON());

//     assert.equal(1, 1);
//   });
// });
