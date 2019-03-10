//////// Some Types...

type TaggedSum<
  TSumName extends string,
  TParams extends any[],
  TTagDefs extends AnyTagDefs
> = { '@sum': TSumName } & TaggedSumTags<TParams, TTagDefs>;

type AnyTagDefs = { [k: string]: any[] };

type TaggedSumTags<
  TParams extends any[],
  TTagDefs extends AnyTagDefs,
  TTagName extends keyof TTagDefs = keyof TTagDefs
> =
  TTagName extends string
  ? TTagDefs[TTagName] extends AnyTupleElement<TParams>[]
  ? { '@tag': TTagName; '@values': TTagDefs[TTagName] }
  : never
  : never
  ;

type AnyTupleElement<TTuple extends any[]> = TTuple[Extract<keyof TTuple, number>];

//// Some Construction...

function taggedSum<
  TSumName extends string,
  TParams extends any[],
  TValueFactories extends <TPs extends TParams>() => { [k: string]: (...args: AnyTupleElement<TPs>[]) => any },
>(sumName: TSumName, getConstructors: TValueFactories) {
  type TSum = TaggedSum<TSumName, TParams, TagDefsOfValueFactories<TValueFactories>>;

  // TODO: ... this all.
  const valueFactories = getConstructors();
  const tagFactories: TagFactories<TSum> = {};

  for (const tagName in valueFactories) {
    type TFactoryType = typeof valueFactories[typeof tagName];
    tagFactories[tagName] = (...args: ArgsType<TFactoryType>) => ({
      '@sum': sumName,
      '@tag': tagName,
      '@values': args,
    });
  }

  return tagFactories;
}

type TagDefsOfValueFactories<
  TValueFactories extends () => { [k: string]: (...args: any[]) => any },
> = {
  [K in keyof ReturnType<TValueFactories>]: ReturnType<TValueFactories>[K] extends (...args: infer TArgs) => any ? TArgs : never;
};

type TagFactories<TSum> =
  TSum extends TaggedSum<infer TSumName, infer TParams, infer TTagDefs>
  ? TSumName extends string ? TParams extends any[] ? TTagDefs extends AnyTagDefs ?
  {
    [K in keyof TTagDefs]: (...args: ArgsType<TTagDefs[K]>) => TSum
  }
  : never : never : never : never
  ;

type ArgsType<TFn> =
  TFn extends (...args: infer TArgs) => any ? TArgs : never;



//////// Examples

//// TaggedSum<Sum, Def>

type Option<T> = TaggedSum<'Option', [T], {
  Some: [T];
  None: [];
}>;

const option0: Option<number> = { '@sum': 'Option', '@tag': 'Some', '@values': [4] };

type Tristate<H, L> = TaggedSum<'Tristate', [H, L], {
  High: [H];
  Low: [L];
  Resistive: [];
}>;

//// TagFactories

type OptionFactories<T> = TagFactories<Option<T>>

//// TagDefsOfValueFactories

const valueFactories0 = <Ts extends [any]>() => ({
  Just(a: Ts[0]) {},
  Nothing() {},
});

type ValueFactories0TagDefsType = TagDefsOfValueFactories<typeof valueFactories0>;
type ValueFactories0TaggedSumType = TaggedSum<'Maybe', [any], TagDefsOfValueFactories<typeof valueFactories0>>;

const maybeSumCtors = taggedSum('Maybe', <Ts extends [any]>() => ({
  Just(a: Ts[0]) {},
  Nothing() {},
}));
