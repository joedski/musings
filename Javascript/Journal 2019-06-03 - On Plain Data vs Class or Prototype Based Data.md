Journal 2019-06-03 - On Plain Data vs Class or Prototype Based Data
========

> NOTE: For the purposes of this document, I'm going to use "Class" and "Class-based" here to refer to any implementation of a datatype which uses the Javascript Prototype-based Class System, regardless of whether or not that datatype is defined using the `class` keyword.
>
> That is to say, if it uses `new Whatever()` or `Object.create(whateverPrototype)` or anything else leveraging the Prototype system to instantiate, it's considered "Class-based" here.
>
> This does not include things like abusing the Prototype system to do things like, say, hide data from the Vue reactivity system.

Pro-Class:

- Datatype operators come with every instance, no need to import each one.
- Fluent APIs are possible through method chaining, which some might consider "more Javascripty".
- Method names don't collide with things in the current execution context, because they are all already namespaced by the instance itself.
- Vue-Specific:
    - Can use methods in the template.
        - However, this can lead to polluting the template with too much transformation that could be trivially hidden in a Computed Prop.  Use sparingly.

Contra-Class:

- Implementing new operators requires either modifying the original class, whether by editing code or monkeypatching; requires a subclass, incurring another link on the prototype chain; or means creating free functions, thereby giving a different API surface.
    - Although, the sub-class case is probably less worse in all but a very few cases.  Modern runtimes can be quite optimized.
- Stringifying To and Parsing From JSON requires [extra boilerplate](./Journal%202019-04-10%20-%20Custom%20Reviver%20in%20JSON%20Parse.md).
    - As shown, though, this boilerplate can be easily standardized, but is still required boilerplate none the less.
- Functional-style tooling, if emplyoying it anywhere, requires a bit of extra thought due to datatype operators being implemented as methods rather than free functions.

Pro-Plain-Data:

- Stringifying To and Parsing From JSON requires no extra boilerplate.  It's all just Objects, Arrays, and Primitives.
- Novel Operators can be defined without having to modify the original definitions, while maintaining a similar API to the original operators.
- Can leverage functional-style tooling without dealing with any funky method-binding stuff.
- No need for new operators to mix free functions with methods: everything is already a free function.
- No need to think about edge cases incurred by Class-based things when dealing with any sort of state management system.

Contra-Plain-Data:

- All operators are free functions, which means either a lot of piecemeal imports, or importing a functions-object as a namespace.
    - Basically, every set of functions becomes its own type-specific Lodash/Underscore.
- Name collisions must be managed.
    - This isn't actually as common of a problem as one might imagine, but it still can occur.
- Data instantiation either requires memorizing a shape or using a factory function.
    - FP oriented people will shrug at this, while Class-OOP oriented people might look mildly frowny.  However, it's unlikely most JS devs will care all that much as long as the API is documented just because JS allows so many different API styles exist in the JS environment.
- Vue-Specific:
    - Can't just use imported functions in templates, have to bind those functions to the instance somehow.
        - Some might say this is a good thing: You should define all your data manipulation in the component via Computed Props, not in the Template.
