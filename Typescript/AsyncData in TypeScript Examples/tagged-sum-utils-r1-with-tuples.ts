//////// Some Types...

type TaggedSum<
  TSumName extends string,
  TTagDefs extends AnyTagDefs
> = { '@sum': TSumName } & TaggedSumTags<TTagDefs>;

type AnyTagDefs = { [k: string]: any[] };

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

//// Some Construction...

function taggedSum<
  TSumName extends string,
  TValueFactories extends () => { [k: string]: (...args: any[]) => any },
>(sumName: TSumName, getConstructors: TValueFactories) {
  type TSum = TaggedSum<TSumName, TagDefsOfValueFactories<TValueFactories>>;

  // TODO: ... this all.
  const valueFactories = getConstructors();
  const tagFactories: TagFactories<TSum> = {};

  for (const tagName in valueFactories) {
    tagFactories[tagName] = (...args: ArgsType<valueFactories[tagName]>) => ({
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

//// TagDefsOfValueFactories

const valueFactories0 = <Ts extends [any]>() => ({
  Just(a: Ts[0]) {},
  Nothing() {},
});

type ValueFactories0TagDefsType = TagDefsOfValueFactories<typeof valueFactories0>;
type ValueFactories0TaggedSumType = TaggedSum<'Maybe', TagDefsOfValueFactories<typeof valueFactories0>>;

const maybeSumCtors = taggedSum('Maybe', <Ts extends [any]>() => ({
  Just(a: Ts[0]) {},
  Nothing() {},
}));
