Journal 2020-03-01 - Getting Started in OCaml
========

I've been meaning to poke another ML for awhile, and OCaml seems to be reasonably ... something.  It's the underlying language which ReasonML is actually a glossy coat over top of, so while some of the window dressing may change the underlying logic shouldn't.

It's also the sort of language/culture where `npm install ocaml` is a thing, so.  There's that, I guess.

Anyway, just noting my learnings from [going through the manual](http://caml.inria.fr/pub/docs/manual-ocaml/).

> NOTE: For anyone else reading this, this is from the perspective of someone who's daily driver is Typescript, but has touched Elm and sometimes pretends to be able to read bits of Haskel.

Another good browse-through is [this "things I wish I knew when learning OCaml" post](https://baturin.org/docs/ocaml-faq/).  Modified in 2018, too.



## Basics

Some notes about the interactive system:

- Phrases (expressions or `let` definitions) are terminated by two semicolons: `;;`
- The result, a definition or `-`, a type, and a value, are printed you enter `;;` and hit enter.
    - This takes the form `${DEF} : ${TYPE} = ${VALUE}`.  Examples:
        - `- : int = 5`
        - `val pi : float = 3.141592653589`
        - `val square : float -> float = <fun>`

Other notes:

- Like many languages, OCaml distinguishes between ints and floats.  There are many times I wish JS did the same.

On to actual entry.

Integer math:

```
# 1 + 2 * 3;;
- : int = 7
```

- Basic math ops follow PEMDAS order of operations, or at least MDAS.

Definition, float math and function application:

```
# let pi = 4.0 *. atan 1.0;;
val pi : float = 3.14159265358979312
```

- Distinct int and float math ops: `*` for int, `*.` for float.

```
# let square x = x *. x;;
val square : float -> float = <fun>
```

- OCaml tries to infer the type of the parameter `x` from its use within the function body: because `*.` takes `float` and `float`, `x` must have the type `float`.

```
# square (sin pi) +. square (cos pi);;
- : float = 1.
```

- Whoever wrote this part likes trig.
- Also, float-add `+.` operator.

```
# square 2;;
Error: This expression has type int but an expression was expected of type
         float
```

- The repl adds an underline to the item it's talking about.  In this case, the `2` was underlined.
- Number literals are strictly typed, never inferred or cast.

That means the correct way to write this is:

```
# square 2.;;
- : float = 4.
```

All is well.



## Basic Data Types

OCaml also has other common data types:

- The above noted `int` and `float`
- `bool`
- `char`
- `string`


### Booleans and Comparison

```
# 1 < 2;;
- : bool = true
# 1 = 2;;
- : bool = false
# 1 < 2 = true;;
- : bool = true
# let one = if true then 1 else 2;;
val one : int = 1
```

- OCaml doesn't use `=` to denote assignment, but rather uses it for the equality comparison.
- `<` and `>` do what you expect, though.
- `if then else` is an expression that returns a value.  _Yes_.  I have to use IIFEs to do that in JS.


### Characters

```
# 'a';;
- : char = 'a'
# int_of_char '\n';;
- : int = 10
```

Not much to say here, other than there's the usual C-style escape.


### Strings

- It's noted in here that strings in OCaml are immutable.  They are in JS, too, so there's that.

```
# "Hello";;
- : string = "Hello"
# "Hello" ^ " " ^ "world";;
- : string = "Hello world"
# let greet who = "Hello " ^ who ^ "!";;
val greet : string -> string = <fun>
# greet "Alan";;
- : string = "Hello Alan!"
```

However, there's another trick: The generalized string delimiter `{||}`

```
# {|You can use " and \ in here.|};;
- : string = "You can use \" and \\ in here."
# {|How do you use \|} in here?|};;
Error: Syntax error
```

What happened here?  The repl highlighted `in` as the source of the syntax error.  What happened then was that the first `|}` was not escaped, even though there was a back slash, but as we saw in the first one, backslashes are treated literally, so the escape wouldn't work!

How to include `|}`?

```
# {example|By just adding a lowercase name between the {}s and ||s, you can use {| and |} in the string!|example};;
- : string =
"By just adding a lowercase name between the {}s and ||s, you can use {| and |} in the string!"
```

Note that uppercase names will not work!


### Other Sundry Data Types

It's a bit hard to build things with just those primitive values, or at least if you had only those you'd quickly throw out the language or at least grab a library.

There are pre-defined data structures: Tuples, Arrays, and Lists.

There are also data structure definition mechanisms: Records and Variants.

#### Lists

- Lists are constructed by `[a; b; c]`.
- Lists can be head-concatted with the `head :: rest` operator.

```
# let some_list = ["a"; "list"; "of"; "strings"];;
val some_list : string list = ["a"; "list"; "of"; "strings"]
# "What" :: some_list;;
- : string list = ["What"; "a"; "list"; "of"; "strings"]
# "This" :: "is" :: some_list;;
- : string list = ["This"; "is"; "a"; "list"; "of"; "strings"]
```



## Pattern Matching

Like other MLs, OCaml deals with pattern matching when it comes to operating on the built in structures like lists and such.

```
# let has_any lst =
  match lst with
  | [] -> false
  | head :: tail -> true
  ;;
val has_any : 'a list -> bool = <fun>
# has_any [];;
- : bool = false
# has_any ["yay"];;
- : bool = true
# has_any ["more"; "than"; "one"];;
- : bool = true
```

We could expand on this, too, since the `tail` item is also a list.

```
# let how_many lst =
  match lst with
  | [] -> "none."
  | head :: [] -> "one..."
  | head :: tail -> "many!"
  ;;
# how_many [];;
- : string = "none."
# how_many ["this"];;
- : string = "one..."
# how_many ["this"; "that"];;
- : string = "many!"
```


### With a Side of Recursion and Multiple Definition and Type Variables

Here's the implementation of insertion sort they show:

```
# let rec sort lst =
  match lst with
  | [] -> []
  | head :: tail -> insert head (sort tail)
and insert elt lst =
  match lst with
  | [] -> [elt]
  | head :: tail -> if elt <= head
    then elt :: lst
    else head :: insert elt tail
;;
val sort : 'a list -> 'a list = <fun>
val insert : 'a -> 'a list -> 'a list = <fun>
# sort some_list;;
- : string list = ["a"; "list"; "of"; "strings"]
# sort ["what"; "a"; "string"; "list"];;
- : string list = ["a"; "list"; "string"; "what"]
```

- The type "list of string" is written `string list`.  Odd.

Had to try a different list because the first one was accidentally in order... But there we go!

Now, taking a look at the types the repl declares, we see something interesting for those list functions:

```
val sort : 'a list -> 'a list = <fun>
val insert : 'a -> 'a list -> 'a list = <fun>
```

The `'a` there is a Type Variable, in the same vein as Typescript generics.  In turn, `'a list` means, more or less, "list of some kind".

Does this mean we can apply `sort` to any homogenous list?

```
# sort [10; 2; 34; 1];;
- : int list = [1; 2; 10; 34]
```

Yup.  Nice.

They wrote in the manual that this is a result of the comparison operators themselves are polymorphic, so if you have any two values of the same type, the comparison operators work.

They also take a moment to note that, like strings, lists in OCaml are immutable.  As can be seen from a plain reading of the above, a new list is created and returned.  Note that lists and arrays are not the same, even if they're both sequence types.

Notably, it seems, arrays are mutable!  More on that later, I suppose.



## Functions as Values

Like in JS, functions are values and can be returned and passed around hither and thither.

The example they give, a derivitive function where you can specify a `dx`:

```
# let deriv f dx = function x -> (f (x +. dx) -. f x) /. dx;;
val deriv : (float -> float) -> float -> float -> float = <fun>
# let sin' = deriv sin 1e-6;;
val sin' : float -> float = <fun>
# sin' pi;;
- : float = -1.00000000013961143
```

Nice.

However, this was given as a nice introduction to the `function ... -> ...` syntax, but that's technically not necessary above.  Looking at the return type, we can already see it's defined as `(float -> float) -> float -> float -> float`, and that you define `sin'` by supplying only two arguments, which are `(float -> float)` and `float`, leaving you with just `float -> float`.

This means in this particular case, you can also define `deriv` like so:

```
# let deriv f dx x = (f (x +. dx) -. f x) /. dx;;
val deriv : (float -> float) -> float -> float -> float = <fun>
# let sin' = deriv sin 1e-6;;
val sin' : float -> float = <fun>
# sin' pi;;
- : float = -1.00000000013961143
```

You can also define a compose operator if you like:

```
# let compose f g = function x -> f (g x);;
val compose : ('a -> 'b) -> ('c -> 'a) -> 'c -> 'b = <fun>
# let cos2 = compose square cos;;
val cos2 : float -> float = <fun>
```

Technically you could also just write that without using `function ... -> ...` either:

```
# let compose f g x = f (g x);;
val compose : ('a -> 'b) -> ('c -> 'a) -> 'c -> 'b = <fun>
# let cos2 = compose square cos;;
val cos2 : float -> float = <fun>
```

And again, the results are the same.

Of course, there are other things you can do with functions, like the perenial favorite of `map`:

```
# List.map (function x -> x * 2 + 1) [0; 1; 2; 3; 4];;
- : int list = [1; 3; 5; 7; 9]
```

Note that `map` itself is easy to define what I've already learned, as they point out:

```
# let rec map f lst =
  match lst with
  | [] -> []
  | head :: tail -> (f head) :: map f tail
;;
val map : ('a -> 'b) -> 'a list -> 'b list = <fun>
# map (function x -> x * 2 + 1) [0; 1; 2; 3; 4];;
- : int list = [1; 3; 5; 7; 9]
```


## Records

Records are declared with the `type` keyword:

```
# type ratio = { num: int; denom: int };;
type ratio = { num : int; denom : int; }
# let add_ratio r1 r2 = {
  num = r1.num * r2.denom + r2.num * r1.denom;
  denom = r1.denom * r2.denom;
};;
val add : ratio -> ratio -> ratio = <fun>
```

Interesting that it automatically picks up on the name in the add function.

- I wonder if that means you can't use record types that haven't been declared?
- Is there any way to say "any record with at least these fields"? (similar to TS interfaces)

```
# add_ratio { num = 1; denom = 3 } { num = 2; denom = 5 };;
- : ratio = {num = 11; denom = 15}
```

As with other data structures, record fields can be expanded in matching expressions:

```
# let integer_part r =
  match r with
    { num = num; denom = denom } -> num / denom
;;
val integer_part : ratio -> int = <fun>
# integer_part { num = 5; denom = 3 };;
- : int = 1
```

In the same way that some cases you can avoid spelling out `function x -> ...`, you can also avoid using `match x with ...` if you have only one pattern to match against.

```
# let integer_part { num = num; denom = denom } = num / denom;;
val integer_part : ratio -> int = <fun>
```

You also don't need to list any field you don't use, or if you want to be pedantic you can add the wildcard `_` after all the fields you do want:

```
# let get_num { num = num } = num;;
val get_num : ratio -> int = <fun>
# let get_denom { denom = denom; _ } = denom;;
val get_denom : ratio -> int = <fun>
```

Like ES6 added to JS, you can also omit the `= other_name` if you just want to reuse the field name as the local var name:

```
# let integer_part { num; denom } = num / denom;;
val integer_part : ratio -> int = <fun>
# let get_num { num } = num;;
val get_num : ratio -> int = <fun>
# let get_denom { denom; _ } = denom;;
val get_denom : ratio -> int = <fun>
```

This shorthand also works when constructing records:

```
# let ratio num denom = { num; denom };;
val ratio : int -> int -> ratio = <fun>
# ratio 5 3;;
- : ratio = {num = 5; denom = 3}
```

The last shorthand they mention is "update" notation:

```
# let integer_product n ratio = {
  ratio with
    num = ratio.num * n;
};;
# integer_product 3 { num = 5; denom = 3 }
  ;;
- : ratio = {num = 15; denom = 3}
```

Since records are immutable, it's just a copy of any unmodified properties with the modified ones stated.



## Variants

Probably my favorite data type out of anything, Variants are also known as (or at least notionally similar to) Tagged Sums, Algebraic Data Types (ADTs), etc.  Basically, they're Enums that can also hold data, which is basically hte best.

Examples:

```
type my_theory = Yes | No;;
type 'a maybe = Just of 'a | None;;
type 'a async_data =
| NotAsked
| Waiting
| Error of error
| Data of 'a
;;
```

Well, assuming `error` is a thing.

You can have multiple values, too:

```
type 'a btree =
| Empty
| Node of 'a * 'a btree * 'a btree
;;
```

I mean, multiple values is a product, so yeah?

So then you can do typical tree things like `member` and `insert`:

```
# let rec member x btree =
  match btree with
  | Empty -> false
  | Node(y, left, right) ->
    if x = y then true else
    if x < y
      then member x left
      else member x right
      ;;
val member : 'a -> 'a btree -> bool = <fun>
# let rec insert x btree =
  match btree with
  | Empty -> Node(x, Empty, Empty)
  | Node(y, left, right) ->
    if x <= y
      then Node(y, insert x left, right)
      else Node(y, left, insert x right)
      ;;
val insert : 'a -> 'a btree -> 'a btree = <fun>
```



## Disambiguation in Records and Variants

Oh hey, they actually call this out.  I did somewhat wonder about this when the repl inferred `ratio` in the above functions dealing with that record type rather than just having a raw record type there.


### Explicit Disambiguation: Annotations

First off, you can always annotate things yourself if you want to be absolutely sure.  This is good practice in cases where ambiguity arrises.

Suppose their examples:

```
# type first_record  = { x:int; y:int; z:int }
  type middle_record = { x:int; z:int }
  type last_record   = { x:int }
;;
# type first_variant = A | B | C
  type last_variant  = A
;;
```

If you want, you can annotate a parameter by wrapping it in parens and adding `:` followed by the type:

```
# let look_at_x_then_z (r: first_record) =
  let x = r.x in
    x + r.z
    ;;
val look_at_x_then_z : first_record -> int = <fun>
```

Here, even though `middle_record` also matches the parameters used in the fuction body, the first parameter has the type `first_record` because we said so.

Incidentally, this also works with type constructors, which themselves already include such type annotations.  Their example:

```
# type wrapped = First of first_record;;
type wrapped = First of first_record
# let f (First r) = r, r.x;;
val f : wrapped -> first_record * int = <fun>
```

Since the destructuring requires the argument to f be a value of `wrapped`, `r` can only be `first_record` because `wrapped`'s only variant is `First of first_argument`, which has `first_argument` by definition.

> Aside: Tuples are constructed with commas, but their types are declared with elements separated by asterisks.  That is, `type key_and_value = string * float` creates a tuple type and `let a = "a key", 3.` creates a value of that type.


### Automatic Measures: Inferrence Details

Again, using their examples:

```
# let project_and_rotate { x; y; _ } = { x = -y; y = x; z = 0 };;
val project_and_rotate : first_record -> first_record = <fun>
```

Here, OCaml can deduce the type by the fields used: `y` only appears in the `first_record` type, and so the records here can only be `first_record`.

However, suppose we don't use all of the fields?  Or have fields used by multiple ones?  What does it do then?

```
# let look_at_xz { x; z } = x;;
val look_at_xz : middle_record -> int = <fun>
```

Both `first_record` and `middle_record` have the fields `x` and `z`, but it chose the latter.  The manual states that this is because, given multiple types which could be inferred, OCaml takes the _last_ type, and in this case since `middle_record` was defined later it wins.

They then go on to note that OCaml does this as eagerly as it can.  Here's another example they give:

```
# let look_at_x_then_y r =
    let x = r.x in
        x + r.y
        ;;
              ^
Error: This expression has type last_record
       The field y does not belong to type last_record
```

Why?

- The parameter `r` doesn't say anything, so OCaml can't determine a type yet.
- At `let x = r.x`, `r` now has a record field access to the field `x`.
    - Multiple types in the current scope have the field `x`, so OCaml picks the last one: `last_record`.
- `x + r.y` causes an error because `r` has already been disambiguated as `last_record` which does not have the field `y`.

The rectification for this would be: `let look_at_x_then_y (r: first_record) = ...`

Another contrived example they give:

```
# let is_a_or_b x = match x with
  | A -> true
  | B -> true
  ;;
    ^
Error: This variant pattern is expected to have type last_variant
       The constructor B does not belong to type last_variant
```

There are two possible rectifications here:

1. Parameter: `let is_a_or_b (x: first_variant) = ...`
2. Match expression: `| (A: first_variant) -> ...`

They go on to note that one should not depend on any given type staying the "last defined compatible type", so if there is any ambiguity you should really just add some annotations.
