import Either from './Either';



//// Either

const _either0: Either<number, Error> = new Either<number, Error>('Left', 42);

// This is both a Type error and a Runtime error now.
const _either1: Either<number, Error> = new Either<number, Error>('No', 42, 9001);

// This is also a Type error, but at Runtime still works.
// However, it only gets the value.
const _either2: Either<number, Error> = new Either<number, Error>('Right', new Error('>:I'), 9001);
