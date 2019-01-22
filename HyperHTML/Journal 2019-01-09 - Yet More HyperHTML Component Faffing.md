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

Vue and React both use an indirection in the form of a VNode-Creation Function named `createElement`, which is usually abbreviated to `h` for reasons, and usually hidden via templates of various sorts, while Mithril names such a function `m`, no doubt for `mmmmcreatemmmmvnode`.  I want to use the component function directly, so I'll either need to wrap it in `ComponentSauce` at definition time, or require some special interface that can be easily recognized.

So something like

```js
import { Component } from 'herpderpHTML'
export default Component((html, { props, state, context, whatever }) => {
    // stuff.
    return html`
        <h1>Hiyas!</h1>
        <p>Hello ${props.name || 'person'}!  I'mma component!</p>
    `
})
```

So close to Mithril but so far.  That's what we get for not putting the Secret Soup in the template.


### Updating Children

The simplest part is if we have no children: so children now, and no children last time?  Nothing!

The next simplest is if all the children are non-components and non-arrays: Do nothing!  It's all hyperHTML stuff.

An array of non-components is similar: Just leave it as is.

Where things are interesting is when we involve components.

The easiest way to do this seems to be to first determine what's being removed, what's being updated, and what's being added.

- Flag every previous child instance for removal
- Flag every next child def based on if there's a previous child:
    - If there's a previous child instance and the previous child instance is the same type as the next child def, flag that child instead for update.
    - Otherwise, flag that child for creation of a new child instance.
- Flush updates:
    - If removing a previous, remove it according to its type:
        - To remove a Component, call its `willDestroy` hook.
        - To remove an Array, call the `willDestroy` hook of any Component elements.
    - If updating a previous, update it according to its type.
        - To update a Component, apply the appropriate updater.
        - To update an Array, follow a similar procedure as to this: Flag, Flag, and Flush.
        - Otherwise, replace the previous.
    - If creating a next:
        - To create a Component, apply the appropriate creator.
        - To create an Array, create any children similarly to this branch.
        - Otherwise, just return it.

#### Or Maybe Not That?

I took a walk and realized I might have been overcomplicating it.

Just map over the array of values:
- If the item is a Component:
    - Check if there ewas previously a cached Array at the Item Index:
        - If Yes, destroy that previous Array,
    - Check if there was a previously cached Component at the Item Key:
        - If Yes:
            - Check if the Component is the same type as the next item:
                - NOTE: Technically, Components of the same Type but with different Keys will return as being of different types.
                - If Yes:
                    - Update the cached Component and return the result of rendering it.
                - If No:
                    - Destroy the previous Component, replace the cached component with an instantiation of the new item, and return the result of rendering it.
        - If No:
            - Cache the instantiation of the new item, and return the result of rendering it.
- If the item is an Array:
    - Check if there was previously a cached Component at the Item Index (taken as the Item Key):
        - If Yes, destroy that Component.
    - Check if there was previously a cached Array at the Item Index:
        - If Yes, update against that array using an algorithm similar to this one, cache the new Array, update each item, and return the results of rendering each item.
        - If No, cache the new Array, update each item, and return the results of rendering each item.
- Otherwise:
    - Check if there was previously a cached Component or Array:
        - If Yes, destroy that previous thing.
    - Return the item.

The only complication I can think of is this: A Keyed Component outside of an Array that is replaced next pass with an item we don't care about, with another item of any sort replaced by Keyed Component of the same Type and Key.

My first thought for handling that edge case was to just check at the index if there was a component previously there, and act accordingly, but that doesn't handle the case of if that component moved to later in the list of children.

My second thought is this:
- At the beginning of each pass, every cached Component is flagged by key for deletion.
- If the Component appears in the mapping pass described above, its flag is deleted.
    - Where, of course, the Component "appears" by matching by key and type.
- After the mapping pass, any Components still flagged have their disposal methods called.

This same map could be used by the mapping pass to handle the disposal method calls, rather than having those in the mapping pass itself.  Arrays will have to have a similar process occur.  In fact, they could probably use the exact same thing, or at least it's very close...  Hm.

Another consideration: I don't even know how other keyed systems handle movement of keyed items between different lists or depths.  I think they just don't.  Not handling that admittedly likely strange case makes things easier.
