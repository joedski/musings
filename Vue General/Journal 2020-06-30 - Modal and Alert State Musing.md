Journal 2020-06-30 - Modal and Alert State Musing
========

ADTs to the rescue again?

Thought: Modal state is better represented as a union of "Hidden" and "Shown with some Value".

That is,

```typescript
type ShowableState<T> =
  | ['Hidden']
  | ['Shown', T]
  ;
```

You could then structure a modal like this:

```html
<app-modal :state="modalState">
  <template v-slot="{ prop, other }">
    Here's a message using prop ({{ prop }}) and other ({{ other }}).
  </template>
</app-modal>
```

I guess this just follows the general unboxing principle of things like passing a promise in or the like.

You could even have extra props on the state value if you wanted, say if you wanted customizable modal appearance.  It'd just become:

```typescript
type ShowableState<T> =
  | ['Hidden']
  | ['Shown', T & { $modal: ModalProps }]
  ;
```

or something like that.
