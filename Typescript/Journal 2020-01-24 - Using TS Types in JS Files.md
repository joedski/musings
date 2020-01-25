Journal 2020-01-24 - Using TS Types in JS Files
========

Theroetically, once `compilerOptions.allowJs` and `compilerOptions.checkJs` are both set to `true`, we should be able to then reference Typescript files that declare types to use type mechanisms we wouldn't otherwise be able to define when using plain JS, or which would be supremely noisy and annoying to write in DocBlocks.

That should take the form of [a triple-slash directive](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html) at the top of the file:

```js
/// <reference path="..." />
```

This doesn't seem to be quite working, though.

I currently have this file:

```js
// validateApiDoc.js
/// <reference path="./validateApiDoc.d.ts" />

// ... omitted for brevity

/**
 * AJV Validator for Swagger v2 Documents.
 * @type {ValidateSwaggerDocFunction}
 */
const validateApiDoc = ajv.compile(swagger2Schema);

module.exports = validateApiDoc;
```

And this type file:

```typescript
// validateApiDoc.d.ts
import { ValidateFunction } from 'ajv';
import { PartialOpenApiDocument } from '../openapi-types';

interface ValidateSwaggerDocFunction extends ValidateFunction {
  (
    data: any,
    dataPath?: string,
    parentData?: object | Array<any>,
    parentDataProperty?: string | number,
    rootData?: object | Array<any>
  ): data is PartialOpenApiDocument;
}
```

But TSC still gives the error `cannot find name 'ValidateSwaggerDocFunction'`.

- Maybe if I export the type?
    - Nope.
- How about if I rename it from `.d.ts` to `.types.ts`?
    - Nope.
- Both export the type _and_ rename the file?
    - Nope.

Hum.  What the heck happened to make things work in the first one off I did?

```js
// index.js
/// <reference path="./types.d.ts" />

/** @type {JSONSchema} */
const FooObject = { type: 'object' };
```

```typescript
// types.d.ts

// importing from `json-types.d.ts`.
import { JSONObject } from './json-types';

/**
 * For now, this is all we're doing, but we should try to make a proper type
 * some time, if just to make things a bit easier.
 */
export type JSONSchema = JSONObject;
```

- ts error: `Cannot find name 'JSONSchema'.`

Unknown, because now that's not working either.  Maybe it's some configuration thing I changed, then.

Excerpt from `tsconfig.json`:

```json
{
  "compilerOptions": {
    "...": "..."
  },
  "include": [
    "... omitted for brevity",
    "scripts/request-codegen/**/*.js"
  ],
  "exclude": ["..."]
}
```

- Try `include`ing `"scripts/request-codegen/**/*.js"`?
    - Nope.
- Try renaming `validateApiDoc.d.ts` to `validateApiDocTypes.ts`?
    - Note: File name is different and lacks `.d`.
    - Nope.
- Try previous step but also exporting type?
    - Nope.
- Try renaming `validateApiDoc.d.ts` to `types.d.ts`?
    - Nope.
- Try previous step but also exporting type?
    - Nope.
- Try `declare interface ...`?
    - Yep.

Huh.

Well.  Okay then.  I guess that makes sense since they're `.d.ts` files, and so thus should only deal in declarations, not executable code.  I must have done that the first time and then forgotten about it.  Knowing me, that's entirely what happened.

Okay, so.  Moving on...

Or.  Not quite.  Things still don't seem to be quite working everywhere.  Augh.

I decided to reread about checking JS files, and they not only support using the triple-slash things which I can't seem to get to work with any consistency, they also support [import types](https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html#import-types), which while verbose will certainly work.

Makes the import syntax a bit annoying, but oh well:

```js
// validateApiDoc.js
/** @typedef {import("./validateApiDoc.types").ValidateSwaggerDocFunction} ValidateSwaggerDocFunction */

/**
 * AJV Validator for Swagger v2 Documents.
 * @type {ValidateSwaggerDocFunction}
 */
const validateApiDoc = ajv.compile(swagger2Schema);
```

```typescript
// validateApiDoc.types.ts

export interface ValidateSwaggerDocFunction extends ValidateFunction {
  // ...
}
```

Of course, now it's a type error but eh, that's what I wanted.  Even though ultimately that means I just ended up deleting the file because AJV's interface is too polymorphic and not constrained enough.  Egh.

I suppose if I really wanted to smooth things out, I could learn to make VS Code plugins and just make one for that specific import thing.  Maybe when I come back later I'll even figure out some way to get triple-slash directives to work.  In the mean time, I'm going to move forward.

As a small aside, I wondered if `/** @typedef {import('./foo.types').Foo} */` works as a short hand.  It does not.  Sadness.

I also tried naming the types file `name.d.ts` for a bit, but that just entirely replaces the inferred types for the corresponding JS file, so I'm just using `.types.ts` as a convention for now.



## Mildly Modified Rapture

While it's not automatic, it seems you at least get intellisense suggestions if you use the triple-slash directives with non-`.d.ts` files.  Not as nice as just bringing in the types, but oh well.

```js
/// <reference path="./foo.types.ts"/>

/** @type {import("./foo.types").Foo} */
const foo = {id: 5, name: 'yay'};
```

If you still want short names, you'll have to do the `@typedef` thing again, but at least it'll be faster than typing everything out manually.

```js
/// <reference path="./foo.types.ts"/>

/**
 * @typedef {import("./foo.types").Foo} Foo
 */

/** @type {Foo} */
const foo = {id: 5, name: 'yay'};
```
