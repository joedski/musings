Writing Mixins That Are Not Terrible
====================================

Mixins are regarded with mixed (in) feelings, some saying they're great, some saying they're bad, most probably somewhere in the middle.  I also have mixed (in) feelings about mixins, and I think it comes down to how they're written:

- I tend to hate mixins that add `methods`.
- Mixins that I myself tend to write usually only involve `data` and lifecycle hooks, using said lifecycle hooks to add a Controller of some sort to the Vue Instance.

Mixins that add methods change the shape of a component itself in a way that isn't really easy to remember.  Using a Controller rather than just adding methods freely like that, while it does have some limitations, they're far out weighed in my opinion by the namespacing provided by said controller.  Lifecycle hooks can then be used to actually bind/parametrize the Controller to the given Instance or Component Definition.



## More Fun with Options

Consider: What is the difference between the following?

Standard Form:

```js
export default {
    name: 'SomeComponent',

    mixins: [SomeMixin],

    someMixin: {
        option: 'yay',
    },
}
```

Mixin Factory Form:

```js
export default {
    name: 'SomeComponent',

    mixins: [
        SomeMixin({
            option: 'yay',
        }),
    ],
}
```

For Mixins applied at the Component Definition, there is no difference!  But!  For global mixins, there is a difference: With the factory form, you lose the ability to parametrize each component individually.
