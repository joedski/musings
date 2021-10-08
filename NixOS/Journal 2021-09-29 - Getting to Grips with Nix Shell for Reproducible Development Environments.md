Journal 2021-09-29 - Getting to Grips with Nix Shell for Reproducible Development Environments
====================================================

1. This seems like quite a nice overview by Mattia Gheda: https://ghedam.at/15978/an-introduction-to-nix-shell
2. Nix Pill on Developing with Nix Shell: https://nixos.org/guides/nix-pills/developing-with-nix-shell.html
3. Docs:
    1. Writing Nix Expressions (which are what are comprised by a `.nix` file): https://nixos.org/manual/nix/stable/#chap-writing-nix-expressions



## Trying Things Out

This is thankfully easy to do!

```sh
nix repl
```

```
Welcome to Nix version 2.3.10. Type :? for help.

nix-repl> _
```

Nice!



## Syntax

Since a `.nix` file is pretty much a Nix Expression with a bunch of sub-expressions, it'd probably be helpful to understand just what all the funny little symbols mean.

To start with, a `.nix` file contains a single expression.

The example they give looks like this:

```
{ stdenv, fetchurl, perl }: # 1

stdenv.mkDerivation {       # 2
  name = "hello-2.1.1";     # 3
  builder = ./builder.sh;   # 4
  src = fetchurl {          # 5
    url = ftp://ftp.nluug.nl/pub/gnu/hello/hello-2.1.1.tar.gz;
    sha256 = "1md7jsfd8pa45z73bz1kszpp01yw6x5ljkjk2hx7wl800any6465";
  };
  inherit perl;             # 6
}
```

The very first thing they note in this example is what those braces up there are about:

> \#1: Nix functions generally have the form `{ x, y, ..., z }: e` where `x`, `y`, etc. are the names of the expected arguments, and where `e` is the body of the function. So here, the entire remainder of the file is the body of the function; when given the required arguments, the body should describe how to build an instance of the Hello package.

The next thing is `stdenv.mkDerivation`, which is used to make a derivation.

> \#2: So we have to build a package. Building something from other stuff is called a derivation in Nix (as opposed to sources, which are built by humans instead of computers). We perform a derivation by calling `stdenv.mkDerivation`. `mkDerivation` is a function provided by `stdenv` that builds a package from a set of attributes.
> 
> A set is just a list of key/value pairs where each key is a string and each value is an arbitrary Nix expression. They take the general form { name1 = expr1; ... nameN = exprN; }.

Items \#3 and \#4 are important, but more to `mkDerivation` than to understanding Nix expressions generally:

> \#3: The attribute `name` specifies the symbolic name and version of the package. Nix doesn't really care about these things, but they are used by for instance `nix-env -q` to show a “human-readable” name for packages. _This attribute is required by `mkDerivation`._
> 
> \#4: The attribute `builder` specifies the builder. This attribute can sometimes be omitted, in which case mkDerivation will fill in a default builder (which does a `configure; make; make install`, in essence). Hello is sufficiently simple that the default builder would suffice, but in this case, we will show an actual builder for educational purposes. The value `./builder.sh` refers to the shell script shown in [Example 14.2, “Build script for GNU Hello (builder.sh)”](https://nixos.org/manual/nix/stable/#ex-hello-builder), discussed below.

\#5 talks about sources a bit more.  Note that remark from before: "… as opposed to sources, which are built by humans …"

> \#5: The builder has to know what the sources of the package are. Here, the attribute `src` is bound to the result of a call to the `fetchurl` function. Given a URL and a SHA-256 hash of the expected contents of the file at that URL, this function builds a derivation that downloads the file and checks its hash. So the sources are a dependency that like all other dependencies is built before Hello itself is built.
> 
> Instead of `src` any other name could have been used, and in fact there can be any number of sources (bound to different attributes). However, `src` is customary, and it's also expected by the default builder (which we don't use in this example).

That is to say, the default builder expects to receive a `src` attribute which in essence means it's executing with an environment var `$src`.  Good to know.

\#6 talks about the `inherit` keyword.  It's like JS's object spread expression, `...obj`.

> \#6: Since the derivation requires Perl, we have to pass the value of the perl function argument to the builder. All attributes in the set are actually passed as environment variables to the builder, so declaring an attribute
> 
> ```
> perl = perl;
> ```
> 
> will do the trick: it binds an attribute `perl` to the function argument which also happens to be called `perl`. However, it looks a bit silly, so there is a shorter syntax. The `inherit` keyword causes the specified attributes to be bound to whatever variables with the same name happen to be in scope.



## Functions

[From the docs](https://nixos.org/manual/nix/stable/#ss-functions)...

In Nix Expressions, a function has the following form:

```
pattern: body
```

Of course, it's not quite that simple...


### Functions of "Multiple" Parameters

That pattern could be a number of different things, and body could even be a second function...

```
p1: p2: body
```

They even show this in a simplistic example:

```
let
    concat = x: y: x + y;
in map (concat "foo") [ "bar", "baz", "bing" ]
```

Which would evaluate to `[ "foobar", "foobaz", "foobing" ]`


### Functions of KV-Set Parameters

However, it's noted that it's a _pattern_ before the `:`, and this is most commonly shown with _set patterns_, which is why many functions have a set as their argument.

```
{ x, y, z }: z + y + x
```

Of course, it'd be nice to have default values without having to do a bunch of `if ... then ... else` malarkey everywhere, so there's a short hand for that:

```
{ x, y ? "Foo", z ? "Bar" }: z + y + x
```

Now, the first example requires a set with exactly `x`, `y`, and `z`; while the second example requires `x`, and optionally `y` and `z`.  None of them permit any other keys at all!

To make things easier, there's an "additional arguments" specifier: the ellipses `...`

```
# now we can accept sets with more than just x, y, and z!
# ... but we can't do anything with them yet.
{ x, y, z, ... }: z + y + x
```

To make use of those extra agruments there's the `@` pattern which is used to allow both destructuring as above while _also binding the raw argument itself to a name_:

```
args @ { x, y ? "Foo", ... }: args.z + y + x
```

It can also come after the destructuring pattern:

```
{ x, y ? "Foo", ... } @ args: args.z + y + x
```

With an aside noting that there's no real point to using `@` without the anything-else specifier `...`.

They further note however that because the alias is bound to the _actual_ function arg, you don't get any default values:

```
let
    exampleFn = args @ { a ? 123, ... }: args
in
    exampleFn {}
```

yields a value of `{}`.


### Conditionals

Not much to say here:

```
if e1 then e2 else e3
```

Where `e1` must evaluate to a boolean value.


### Assertions

These come in the general form of:

```
assert e1; e2
```

Which lets you chain them together:

```
assert cond1;
assert cond2;
assert cond3;

# Now we've passed cond1, cond2, and cond3, we can define our derivation...

stdenv.mkDerivation {
    ...
}
```


### With

This is a convenience thing that is somewhat similar to Javascript's `with` keyword.  Given this expression...

```
with someset; expr1
```

The _set_ `someset` is introduced into the lexical scope of the expression `expr1`.  So you can do things like this:

```
with { foo = "Foo"; bar = "BAR!" };
foo + bar
```

will evaluate to `"FooBAR!"`.

However, `with` does _not_ shadow bindings set in other ways:

```
let a = 1; in with { a = 2; }; let a = 3; in with { a = 4; }
    a
```

We get `3`, not `4` or `2` or `1`.  The inner `let` will shadow the outer `let`'s binding of `a`, but neither `with` will shadow either `let`'s binding.


### Comments

Not much to say here:

- Line comments start with `#` like in many scripty languages.
- Block comments are C-style `/* ... */` affairs.


### Operators

For the most part, [the operators in Nix expressions](https://nixos.org/manual/nix/stable/#table-operators) are pretty similar to other languages, there's just a few that stick out to me:

- **Select:** Used to navigate sets, possibly nested.  `s1.k1` or `s1.s2.k3`, etc.
    - Select with Default: just add `or defexpr`, like with `s1.s2.k3 or false`.
    - The default is returned if Selection cannot traverse a set at any point.  If no default is specified, then execution aborts as it should.
- **Has Attribute** checks if a set contains the attribute denoted by an attribute path.
    - So, `e1 ? foo` or `e1 ? foo.bar.baz` etc.
- **List Concatenation** is `++` in Nix Expressions, which isn't actually so wierd.
- **Update Set** creates a new set by merging 2 other sets, with the right set's values taking precedence for any duplicate keys.
    - So `{ foo = "foo"; bar = "bar"; } // { foo = "FOO"; }` yields `{ foo: "FOO"; bar: "bar"; }`
- **Logical Implication** which takes the form `e1 -> e2` and is equivalent to `! e1 || e2`.
    - Why's this useful?  Because there are cases where we want to check some condition `e2`, but only if `e1` is actually set/not-false.
    - Whereas, if we want to disable `e1` we just pass `false` and the check is skipped because `!e1` evaluates to `true`.
    - So, basically, `e1` is not-false?  Then evaluate `e2`.  Is `e1` set to `false`?  Then don't evaluate `e2` and bypass this condition.

Okay, that last one is kind of hashed explanation wise, so here's the example they show: Subversion's package expression:

```nix
{ localServer ? false
, httpServer ? false
, sslSupport ? false
, pythonBindings ? false
, javaSwigBindings ? false
, javahlBindings ? false
, stdenv, fetchurl
, openssl ? null, httpd ? null, db4 ? null, expat, swig ? null, j2sdk ? null
}:

# Note that the above default to false, but a value can be optionally provided...

# Now, if localServer is set to true, then we need to check db4 is not null.
# However, if localServer is not specified, it defaults to false, which means
# we don't care about the db4 check and can skip it.
assert localServer -> db4 != null;

# Same thing here: if httpServer is set to true, we now must check httpd...
# but if it's left as false we don't care about that check.
assert httpServer -> httpd != null && httpd.expat == expat;

# Etc, etc...
assert sslSupport -> openssl != null && (httpServer -> httpd.openssl == openssl);
assert pythonBindings -> swig != null && swig.pythonSupport;
assert javaSwigBindings -> swig != null && swig.javaSupport;
assert javahlBindings -> j2sdk != null;

stdenv.mkDerivation {
  name = "subversion-1.1.1";
  ...
  openssl = if sslSupport then openssl else null; 4
  ...
}
```
