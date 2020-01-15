Journal 2020-01-07 - Custom Vue Base Class - Actually Doing It
========



## Whack 1: Update ALL THE COMPONENTS

So.  We've got a few things going on here.


### Creating a Custom Base Class

It's basically just

```typescript
import { Vue } from 'vue-property-decorator';
import { Store } from 'vuex';
import { AppState } from '@/store/store.ts';

abstract class CustomVue extends Vue {
  public $store!: Store<AppState>;

  // any other things we need...
}

// assign statics.
Object.assign(CustomVue, Vue);

export default CustomVue;
```

This of course won't actually work until absolutely everything uses it.  So...


### Updating Import Lines

There's a few cases to deal with here.

#### Vue Is The Only Import

In this case, we directly want to replace the import line.

```typescript
import { Vue } from 'vue-property-decorator';
```

becomes...

```typescript
import CustomVue from '@/util/CustomVue';
```

#### Vue Is Not The Only Import

Here, we've got a few different cases.  Take these:

```typescript
import { Component, Vue } from 'vue-property-decorator';
import { Vue, Component } from 'vue-property-decorator';
import { Component, Vue, Watch } from 'vue-property-decorator';
```

... each should become the following, respectively...

```typescript
import { Component } from 'vue-property-decorator';
import CustomVue from '@/util/CustomVue';

import { Component } from 'vue-property-decorator';
import CustomVue from '@/util/CustomVue';

import { Component, Watch } from 'vue-property-decorator';
import CustomVue from '@/util/CustomVue';
```

I think this can be more or less done with a bunch of alternations.  Any unused groups will be empty.

```regexp
import (?:\{ Vue,( .*)\}|\{(.*), Vue \}|\{(.*), Vue(, .*)\}) from 'vue-property-decorator';
```

```
import {$1$2$3$4} from 'vue-property-decorator';
import CustomVue from '@/util/CustomVue';
```

Not going to worry about exact spacing because Prettier will handle that.  Granted, it saves one capture group, but hey.


### Updating Most of the Classes

The majority of usages of Vue is as a base class for components because we're using `vue-property-decorator`, in case that wasn't obvious from the Regexes.

This means the vast majority of uses can be covered by a simple search and replace:

```
extends Vue {
```

```
extends CustomVue {
```

Booyah.


### Updating Mixins

Oh Boy.

So.  This is mildly annoying.

Basically a whole bunch of type stuff has to be duplicated for this to work as fluidly as the original.  Maybe.  I might be able to get away with some inferrence.

```
import { Mixins as BaseMixins } from 'vue-property-decorator';

@Component
class MixinBase extends CustomVue {}

function Mixins<TMixins extends any[]>(...mixins: TMixins) {
  return class ClassWithMixins extends BaseMixins(
    MixinBase,
    ...mixins
  );
}
```

Maybe that'll work.



## Whack 2: Interface Extension/Merging

We could just go the more pragmatic route and do an interface extension, and just assume that the interface is updated to match.

```typescript
declare module "vue/types/vue" {
  interface Vue {
    $store: Store<AppState>;
    // ... other stuff.
  }
}
```

These can only appear in `.d.ts` files and for that reason are kinda wonky.  Bluh.
