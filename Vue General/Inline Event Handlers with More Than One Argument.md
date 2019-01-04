Inline Event Handlers with More Than One Argument
=================================================

It's pretty well known that Vue aliases the first argument of an inline event handler to a variable named `$event`.  However, you can also specify a Function Expression as your value.  This may be confusing since the way Event Handlers are, well, handled is a bit odd:
- If your expression itself includes a function call, Vue takes that to be handling of the event.
- Otherwise, it tries to treat the value returned by the expression as itself a function that Vue itself will call to handle the event.

This gives rise to the two most common forms:
- Function Call: `<foo @ding="handleDing($event)" />`
- Function Value: `<foo @ding="handleDing" />`

Of note: If `handleDing($event)` itself returns a function, then Vue will ignore it!

So, how do you handle more than one argument inline?  Specify a function expression, of course:
- Function Expression: `<foo @ding="($event, other) => handleDing(index, $event, other)" />`

It's obvious in retrospect, but maybe not in quite obvious before you know it, especially considering the case of a function call as the expression.  I haven't bothered looking into this too deeply, but it's worth pointing out that [Vue's own docs for `v-on`](https://vuejs.org/v2/api/#v-on) state that the directive expects one of either a `Function`, `Inline Statement`, or `Object`.  I expect that `handleDing($event)` falls under `Inline Statement` while `handleDing` and `($event, other) => handleDing(index, $event, other)` fall under `Function`.

While the [Directive docs](https://vuejs.org/v2/guide/custom-directive.html#ad) state that the `binding` argument has both `binding.value` and `binding.expression`, I'm still not sure how `v-on` might distinguish between `Function` and `Inline Statement`, especially if that inline statement returns a Function.
