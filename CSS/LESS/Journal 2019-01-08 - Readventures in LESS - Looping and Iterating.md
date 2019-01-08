Readventures in Less - Looping and Iterating
============================================

So, I haven't done anything fancy with Less in awhile, so this is going to be fun.  I do recall that loops/iterations in Less are done through recursion rather than actual looping, so there's that.

The specific thing I'm doing is a quick hack to unfloat all the column styles in Bootstrap.



## Some Quick Things


### Force evaluation of expressions in Less by wrapping them in parens

```less
.foo {
    // Just passing a boolean expression as if()'s first arg
    // results in a parsing error.
    // Or at least, it did before Less 3.6.
    // Allegedly it's not supposed to error any more.
    width: if((@foo = foo), 0, 42px);
}
```


### Lists are 1-indexed

Not mentioned anywhere, even in the [documentation of `extract`](http://lesscss.org/functions/#list-functions-extract).  The only way you can tell is from their example:

```less
@list: apple, pear, coconut, orange;
value: extract(@list, 3);
// Result:
//   value: coconut;
// which is the 3rd element of the list.
```


### Unquoting is (usually?) only required for quoted string values

Because interpolation works in selectors.

```less
.foo (@n) when (@n > 0) {
    .foo-@{n} {
        // Without the Unquote Operator ~ this would have
        //   width: "3em";
        // instead of the expected
        //   width: 3em;
        // Incidentally, just using @{n}em without quotes
        // results in a parser error.
        width: ~"@{n}em";
    }
}
```


### "Looping" is done with guarded mixins

```less
.foo (@n) when (@n > 0) {
    .foo-@{n} {
        width: ~"@{n}em";
    }
}

.foo(3);
```

This produces:

```css
.foo-3 {
    width: 3em;
}
.foo-2 {
    width: 2em;
}
.foo-1 {
    width: 1em;
}
```


### The boolean operators are comparitors `>`/`>=`, `<`/`<=`, and `=`, binary `and`, `or`, and unary `not`

I couldn't find these spelled out anywhere until finally lucking into them in the [documentation on the `if` function](http://lesscss.org/functions/#logical-functions-if), which is pretty annoying.


### The `if` function is used for conditional values

[Yep](http://lesscss.org/functions/#logical-functions-if).

It can also work with detached rule sets, but the usage is really awkward because it returns a value, but is not itself a statement.

```less
@herp: if(@should-do-thing, {
    width: 100px;
    height: 100px;
}, {
});
// Then you state the variable with parens afterwards.
@herp();
```


### Guards are used for conditional styles too

Apparently as far back as 1.5.0 [you could use CSS guards on selectors and not just mixins](http://lesscss.org/features/#css-guards-feature).  Okay, that's that solved.

```less
// You can store booleans in variables...
@should-do-thing: true;

// Then use them directly without comparing to true or false.
button when (@should-do-thing) {
    display: block;
}

button when not (@should-do-thing) {
    display: none;
}
```

You can also group multiple things in one parent by using the parent selector:

```less
.foo {
    & when (@should-do-thing = true) {
        button {
            display: block;
        }
        fieldset {
            border-width: 100em;
        }
    }
}

// You can also use it at the top level:
& when (@should-do-thing) {
    button {
        height: 5000px;
    }
}
```



## Back To the Use Case

Learning in anger, yeeeeaaah.  With all the above finally understood, I came up with this as the initial whack:

```less
// main interface for this mixin.
.col-unfloat-sizes (@sizes; @max-span; @size-index: length(@sizes)) when (@size-index > 0) {
  @size: extract(@sizes, @size-index);
  .col-unfloat-size-spans(@size; @max-span);

  .col-unfloat-sizes(@sizes; @max-span; @size-index - 1);
}

// aux mixin to cover all spans of a given size.
.col-unfloat-size-spans (@size; @span) when (@span > 0) {
  .col-@{size}-@{span} when not (@size = false) {
    float: none;
    width: 100%;
  }

  .col-@{span} when (@size = false) {
    float: none;
    width: 100%;
  }

  .col-unfloat-size-spans(@size, @span - 1);
}
```

Then it gets called like so:

```less
.col-unfloat-sizes(lg md sm xs false; 12);
```

I could probably tidy it up a bit using `if()`:

```less
// aux mixin to cover all spans of a given size.
.col-unfloat-size-spans (@size; @span) when (@span > 0) {
  @col-size-span: if(@size = false, ~"@{span}", ~"@{size}-@{span}");

  .col-@{col-size-span} {
    float: none;
    width: 100%;
  }

  .col-unfloat-size-spans(@size, @span - 1);
}
```

Yeah, that's a bit tidier.  Alas, though, the project I'm on that I'm trying this on (I don't even know if it'll fix our rendering during printing) is using Less 2.7.2, which chokes on the string-unquoting.  Or something.  I dunno.  Regardless, it dies around there.
