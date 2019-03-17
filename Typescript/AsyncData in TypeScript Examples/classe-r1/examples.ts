import TaggedSum, {
  AnyTaggedSum,
  TaggedSumTagDefs,
  TaggedSumCataHandlers,
  TaggedSumTagNames,
  TaggedSumCataHandlerArgs,
  Tail,
  TaggedSumSpecializedTo,
} from './TaggedSum';

import Maybe from './Maybe';

// Just checking some extends things.
type _CheckNoArgs = ['Foo'] extends [string] ? true : false;
type _CheckWithArgs = ['Bar', string] extends [string] ? true : false;
type _CheckWithArgs2 = ['Bar', string] extends [string, ...any[]] ? true : false;
type _CheckUnion = (['Foo'] | ['Bar', string]) extends [string, ...any[]] ? true : false;

// Playing with Maybe...
type _MaybeHandlers<A> = TaggedSumCataHandlers<Maybe<A>>;
type _MaybeTypes<A> = Maybe<A> extends TaggedSum<any, infer TTypes> ? TTypes : never;
type _MaybeTypeNames = _MaybeTypes<any> extends [infer TNames, ...any[]] ? TNames : never;
type _MaybeTypeNamesTest = TaggedSumTagNames<Maybe<any>>;
type _MaybeTypeAnyFns = (...args: Tail<_MaybeTypes<any>>) => any;
type _MaybeTypeFnOfJust = (...args: Tail<Extract<_MaybeTypes<boolean>, ['Just', ...any[]]>>) => any;
type _MaybeTypeFnOfNothing = (...args: Tail<Extract<_MaybeTypes<boolean>, ['Nothing', ...any[]]>>) => any;

// POC of tagged sum tag-specialization
type _MaybeSpecialization<TTagName> =
  TTagName extends TaggedSumTagNames<Maybe<number>>
  ? Maybe<number> extends TaggedSum<infer TSum, infer TTagDefs>
  ? TaggedSum<TSum, Extract<TTagDefs, [TTagName, ...any[]]>>
  : never : never;
type _MaybeSpecializedToJust = _MaybeSpecialization<'Just'>;

//// Playing around with concrete values

// should return T extends Maybe<string>
const maybe0: Maybe<string> = new Maybe('Nothing');
const maybe1: Maybe<string> = new Maybe('Just', 'this string');
const maybe0DaggyStyle: Maybe<string> = Maybe.Nothing();
const maybe1DaggyStyle: Maybe<string> = Maybe.Just('this string here');

// should elicit errors
const maybe2: Maybe<number> = new Maybe('Just', '5');
const maybeErrorTooManyArgs: Maybe<string> = new Maybe('Nothing', 'yes', 'no');
const maybeErrorTooFewArgs: Maybe<string> = new Maybe('Just');
const maybeErrorNoType: Maybe<string> = new Maybe();
const maybeErrorNotValidType: Maybe<string> = new Maybe('Not A Type');

// Maybe<string>.cata()
const mapbe0value0 = maybe0.cata({});
const maybe0value1 = maybe0.cata({
  Nothing: () => 0,
});
const maybe0value2 = maybe0.cata({
  Nothing: () => 0,
  Just: (a: string) => a.length,
});
// Haven't found a good way of restricting allowed props, but at least the return type is accurate.
const maybe0value3 = maybe0.cata({
  Nothing: () => 0,
  Just: (a: string) => a.length,
  Foo: () => true,
});

// Maybe.is
const maybe0AsAny: any = maybe0;
if (Maybe.is(maybe0AsAny)) {
  maybe0AsAny.cata({
    Nothing: () => console.log('Nothing!'),
    Just: (a: unknown) => console.log('Just this:', a),
  });
}

if (Maybe.isType('Just', maybe0AsAny)) {
  // isType doesn't preserve anything besides the case name,
  // so typeName here is 'Just', but that's all we get.
  const typeName = maybe0AsAny.type[0];
  // We get unknown here, due to the above.
  const typeValue1 = maybe0AsAny.type[1];
  // Error: No element at index 2.
  const typeValue2 = maybe0AsAny.type[2];
  // :: "Just"
  const typeName2 = maybe0AsAny.tag;
  // :: [unknown]
  const values = maybe0AsAny.values;
}
