import Either from './Either';

interface Foo {
  foo: string;
}



//////// Either

//// Errors

// Error: Type 'Either<"not a number", "not a number">' is not assignable to type 'Either<number, Error>'.
const eitherErrors0: Either<number, Error> = new Either('Left', 'not a number');
// Error: Property '1' is missing in type '["Left"]' but required in type '["Left", number]'.
const eitherErrors1: Either<number, Error> = new Either('Left');
// Error: Type '["Left", 5, 10]' is not assignable to type '["Left", number]'.
//   Types of property 'length' are incompatible.
//     Type '3' is not assignable to type '2'.
const eitherErrors2: Either<number, Error> = new Either('Left', 5, 10);
// Error: Type '[]' is missing the following properties from type '["Right", Error]': 0, 1
const eitherErrors3: Either<number, Error> = new Either();
// Error: Argument of type '["Invalid Tag", 5]' is not assignable to parameter of type '["Left", 5] | ["Right", 5]'.
//     Type '["Invalid Tag", 5]' is not assignable to type '["Left", 5]'.
//       Type '"Invalid Tag"' is not assignable to type '"Left"'.
const eitherErrors4: Either<number, Error> = new Either('Invalid Tag', 5);
// Error: Expected 1 arguments, but got 0.
const eitherErrors5: Either<number, Error> = Either.Left();
// Error: Expected 1 arguments, but got 2.
const eitherErrors6: Either<number, Error> = Either.Right(new Error('beh'), 'oh no');

//// Proper Typing of Construction

// this gets a type error: Type 'Either<42, 42>' is not assignable to type 'Either<number, Error>'.
// For whatever reason, the constructor gets inferred type "new Either<42, 42>".
// I'm guessing this has to do with both type params referring to args[1],
// even though args[0] has one of the cases.
const either0CU: Either<number, Error> = new Either('Left', 42);
// Put more abstractly, given <L, R>(l: L) => new Either('Left', l),
// Typescript infers things to <L, R>(l: L) => new Either<L, L>('Left', l).
// To fix this, we have to specify the types...
const either0CP: Either<number, Error> = new Either<number, Error>('Left', 42);
// Or, if we use a factory function to do that for us, telling Typescript that those two types
// should be different, then it works things out.
// This requires more investigation.
const either0F: Either<number, Error> = Either.Left(42);
const either1F: Either<number, Error> = Either.Right(new Error('oh no'));
const either2F: Either<Foo, Error> = Either.Left({ foo: 'yay' });

//// Cata

const value0 = either0F.cata({
  Left: (n: number) => n,
  Right: (_e: Error) => NaN,
});

// Error: Property 'Right' is missing in type '{ Left: (n: number) => number; }' but required in type 'TaggedSumCataHandlers<TaggedSum<"Either", ["Left", number] | ["Right", Error]>>'.
const value0Missing = either0F.cata({
  Left: (n: number) => n,
});

// No error for too many handlers, though.
// But, the return type is still "number" because the type
// is derived only from the tags that might be called.
const value0Excess = either0F.cata({
  Left: (n: number) => n,
  Right: (_e: Error) => NaN,
  Middle: (_a: string) => false,
});
