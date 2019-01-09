- Components should receive special treatment.
- Non-Components should not interrupt Components despite intervening.

Hm.

- Each Component could be thought of as itself and a list of either children or lists of children.
    - Also some other stuff, but that's not really important.

When we render a component, we need a few things:
- Its instance, because in the template we only declare what component it is.  Well, and its arguments, but anyway.  And also its key...
- Any other things each one gets, like Child Context.

This means the function we call to invoke a Component in the Template is actually a wrapper that returns some sort of representative, which it self just says "This Component with these args".

So, this:

```js
wire(inst)`
    <h1>hi!</h1>
    ${Foo({ message: 'hello!' })}
`
```

returns something like this:

```js
{
    template: [...],
    values: [
        { component: Foo, args: { message: 'hello!' } },
    ],
}
```

Likely what will happen is we'll do something like wrapping `hyperHTML.wire` so that we get something like this:

```js
const instDataStore = new WeakMap()

const wire = (inst) => (template, ...values) => {
    const creating = ! instDataStore.has(inst)
    if (creating) {
        instDataStore.set(inst, createInstData())
    }
    const instData = instDataStore.get(inst)
    const processedValues = values.map((child, index) => {
        if (child != null && typeof child === 'object' && child.component != null && typeof child.component === 'object') {
            return updateChild(instData, child, index, values)
        }
        return child
    })
    return hyperHTML.wire(inst)(template, ...processedValues)
}
```

As noted somewhere else, we don't care about reordering children per se, that'll be handled in the DOM by hyperHTML.  All we care about is whether a child is created, merely updated, or destroyed.

How much of this could we shove into a hyperHTML intent?  Could we just add a `hyperHTML.define('component', ...)`?  That would require some funny handling for sure, to deal with deeply nested children.  Granted, deeply nested children is a weird use case, since it's unlikely that child Components are going to not have a parent Component.  The only time that should happen is if we're rendering the top level component.

I suppose I could see it if you had a presentational shorthand, like `grid(...)` or something.  Egh, that requires being too careful, then.


### On Special Components vs Plain Functions

If we want to automate the drudgery, then we'll have to in some way wrap our Components.  This could include measures such as registering them with a global store, passing them to a `Component`-blessing function, using a base class, etc.

Vue and React both use an indirection in the form of a VNode-Creation Function named `createElement`, which is usually abbreviated to `h` for reasons.  I want to use the component function directly, so I'll either need to wrap it in `ComponentSauce` at definition time, or require some special interface that can be easily recognized.
