Journal 2020-01-28 - Interfaces and Child Components, Featuring Typescript
========

With concessions to pragmatism by not including full on run-time validation.

This is a simple idea on how to ensure you know the type of the data coming into your child component, even though passing data via props in the template in Vue is inherently unsafe due to templates being strings that are compiled separately.  (or even at run time!)

The idea is this: You have the following in any component set:

- Parent component
- Child component (or many children!)
- Types file

The types file is used for, among anything else it might be used for, defining interfaces for various props, where those interfaces differ from any pre-defined ones.

So basically, you might say "I'm going to pass a collection of records that have this one entity and one sub-entity from it".

```typescript
import Thing from '@/types/Thing.ts';
import SubThing from '@/types/SubThing.ts';

export interface ThingSubThingRecord {
    thing: Thing;
    subThing: SubThing;
}
```

Then in your parent you might have something like

```html
<template>
    <div>
        <sub-thing-menu-item
            v-for="record in thingSubThingRecords"
            :key="record.subThing.id"
            :record="record"
        />
    </div>
</template>
```

```typescript
import Vue from 'vue';
import { ThingSubThingRecord } from './types.ts';

export default Vue.extend({
    computed: {
        thingSubThingRecords(): ThingSubThingRecord[] {
            // ... derive data here!
        },
    },
});
```

And in your child you might see something like this:

```typescript
import Vue from 'vue';
import { PropValidator } from 'vue/types/options';
import { ThingSubThingRecord } from './types.ts';

export default Vue.extend({
    props: {
        record: {
            type: Object,
            required: true,
            // more strict would be to add a `validate` prop.
        } as PropValidator<ThingSubThingRecord>,
    },
});
```

It's a bit more concise if you use the dreaded `vue-class-component` and `vue-property-decorator`:

```typescript
import { Vue, Prop } from 'vue-property-decorator';
import { ThingSubThingRecord } from './types.ts';

export default class SubThingMenuItem extends Vue {
    @Prop({ type: Object, required: true })
    public record!: ThingSubThingRecord;
}
```

Upside: you now have a clearly defined contract between the two components.

Downside: you now have a separate interface you have to change every time.

Static typists will probably tell you that's a good thing, but it can be rather annoying if you don't even know what you're dealing with.  Personally I fall more on the static side because I get extremely antsy if I don't have a defined interface somewhere.  (Although you can always use `any` if you need something you'll fix later... just actually fix it later.)
