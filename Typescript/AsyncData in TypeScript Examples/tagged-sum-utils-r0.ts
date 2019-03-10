type TaggedSum<
  TSumName extends string,
  TTagDefs extends AnyTagDefs
> = { '@sum': TSumName } & TaggedSumTags<TTagDefs>;

type AnyTagDefs = { [k: string]: any[] };

type AnyTaggedSum = { '@sum': string, '@tag': string, '@values': any[] };

type TaggedSumTags<
  TTagDefs extends AnyTagDefs,
  TTagName extends keyof TTagDefs = keyof TTagDefs
> =
  TTagName extends string
  ? TTagDefs[TTagName] extends any[]
  ? { '@tag': TTagName; '@values': TTagDefs[TTagName] }
  : never
  : never
  ;

// This also works.  I'm not sure if it's any better.
// type TaggedSumTags2<TTagDefs extends { [k: string]: any[] }> =
//   keyof TTagDefs extends infer TTagName
//   ? TTagName extends keyof TTagDefs
//   ? { '@tag': TTagName; '@values': TTagDefs[TTagName] }
//   : never
//   : never
//   ;

type TaggedSumFactoriesMap<TSum extends AnyTaggedSum> = {
  [K in TagKeysOf<TSum>]: TaggedSumFactory<TSum, K>;
};

type TaggedSumFactory<
  TSum extends AnyTaggedSum,
  TTagName extends string
> = (...args: TagValuesType<TSum, TTagName>) => TaggedSumInstance<TSum, TTagName>;

type TagValuesType<
  TSum extends AnyTaggedSum,
  TTagName extends string
> = TaggedSumInstance<TSum, TTagName>['@values'] extends infer TValues
  ? TValues extends any[]
  ? TValues
  : never
  : never
  ;

type TaggedSumInstance<TSum extends AnyTaggedSum, TTagName extends string> = Extract<TSum, { '@tag': TTagName }>;

type TagKeysOf<T> = T extends { '@tag': infer TTagKey } ? TTagKey extends string ? TTagKey : never : never;

//// Factory-Factory

function createFactories<
  TSumName extends string,
  TValuesFactories extends { [key: string]: (...args: any[]) => any[] },
>(sumName: TSumName, valuesFactories: TValuesFactories) {
  type ValuesFactoriesType = typeof valuesFactories;
  type InstanceFactoriesType = {
    [K in keyof ValuesFactoriesType]: <TArgs extends ArgsType<ValuesFactoriesType[K]>>(...args: TArgs) => {
      '@sum': TSumName,
      '@tag': K,
      '@values': TArgs
    };
  };

  const instanceFactories = {} as InstanceFactoriesType;

  for (const tagName in valuesFactories) {
    instanceFactories[tagName] = <TArgs extends ArgsType<ValuesFactoriesType[typeof tagName]>>(...args: TArgs) => ({
      '@sum': sumName,
      '@tag': tagName,
      '@values': args,
    });
  }

  return instanceFactories;
}

// type ArgsType<TFn> = TFn extends (...args: infer TArgs) => any ? TArgs extends any[] ? TArgs : never : never;
type ArgsType<TFn> = TFn extends (...args: infer TArgs) => any ? TArgs : never;



//////// Examples

//// TaggedSum<Sum, Def>

type Option<T> = TaggedSum<'Option', {
  Some: [T];
  None: [];
}>;

const option0: Option<number> = { '@sum': 'Option', '@tag': 'Some', '@values': [4] };

type Tristate<H, L> = TaggedSum<'Tristate', {
  High: [H];
  Low: [L];
  Resistive: [];
}>;

//// TagValuesType

type OptionSomeValuesType<T> = TagValuesType<Option<T>, 'Some'>;
type OptionNoneValuesType<T> = TagValuesType<Option<T>, 'None'>;

//// TaggedSumFactory

type OptionSomeFactory<T> = TaggedSumFactory<Option<T>, 'Some'>;
type OptionNoneFactory<T> = TaggedSumFactory<Option<T>, 'None'>;

//// TaggedSumFactoriesMap

type OptionFactoriesMap<T> = TaggedSumFactoriesMap<Option<T>>;
type OptionFactoriesMapSome<T> = OptionFactoriesMap<T>['Some'];
type OptionFactoriesMapNone<T> = OptionFactoriesMap<T>['None'];

//// createFactories

const { Some, None } = createFactories('Option', {
  Some<A>(a: A) { return [a] },
  None() { return [] },
});

const optionValue0: Option<boolean> = Some(true);
const optionValue1: Option<boolean> = Some(true, false);

type ReturnTypeSomeExtendsOption<T> = typeof Some extends <TArgs extends [T]>(...args: TArgs) => Option<T> ? true : false;
type ReturnTypeSomeExtendsOptionBoolean = ReturnTypeSomeExtendsOption<boolean>;
