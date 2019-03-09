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
