Function Pointers in C and C++
==============================

Function pointers point to code!  They're about as close to treating functions as values as you get in raw C and C++.

How does this work?  Well, let's start with some examples.



## Examples of Function Pointers and their Syntax

I'll start with the simplest case, a function with no arguments that takes nothing.

```c
void someFunc() {
  // ... magic!
}
```

The way to write a pointer to such a function is this:

```c
void (*funcPointer)();
funcPointer = someFunc;
funcPointer();
```

Note that the `*` appears wrapped in parens along with the pointer's name.  We can then assign directly to that by using the target function's name, and call funcPointer just like any other function.

Supposing we want to have arguments, then we can just add the types for each of those arguments in the parens that follow, but omitting any names since we're not really declaring any additional variables here; rather, the only variable is the function pointer itself.

```c
void funcWithArgs(int a, float b) {
  // ... magic!
}

void (*pointerWithArgs)(int, float) = funcWithArgs;
funcWithArgs(4, 8.92);
```

Return types are similarly easy: Just replace `void` with desired type!

```c
float timesTwo(float a) {
  return a * 2.0;
}

float (*funcPointerReturningFloat)(float) = timesTwo;
float b = funcPointerReturningFloat(5); // => 10
```

And in fact, you can return pointers to things, and the pointer indicator binds more tightly to the return type than to the var type itself, thus the ever present parens.

```c
char *reverse(const char * s) {
  // create new string from s.
}

char *(*thingReturningNewString)(const char *) = reverse;
```



## More Fun!

It's not as complicated as it first looked, the only oddity really to add being the required parens around the varname.  Using this, however, we can do something fun: Decoupling functions from the classes they apply to!

For instance, let's say we have an RGB Triple that we want to manipulate... but!  We don't want to specify all the possible ways to manipulate them up front!  Well, we could have some built in methods and then use free functions elsewhere... Or just make everything with free functions.  But, that makes doing multiple calls annoying.

```c++
RGBColor color = {0, 255, 0};
RGBColor nextColor = foo(bar(baz(color)));
```

There must be a better way!

```c++
RGBColor color = {0, 255, 0};
RGBColor nextColor = color.map(foo).map(bar).map(baz);
```

Looks kinda like a monad.  It basically is!

Can't quite get there, though, because we can't bind functions to arguments as easily as we can with a more dynamic language.  Still, amusing!


### Functions and Arguments

In C and C++, functions aren't really full type values, so the only way to pre-bind values is to store them explicitly.

C++ however affords an extra convenience: Classes with Operator Overrides.

Because of one of the ways C++ constructors can be called, `Foo(bar, baz)`, and overriding of the `()` operator, you can create a function (constructor) that returns a "function" (class instance with `()` operator overridden), thus letting you create functions that effectively capture over values by turning them into instance props.

You can then use these with something by taking advantage of the fixed interface they all have in their `()` operator to use them on a "monad", thereby making the instances "functors".  Sorta.

Now, the nice thing is, starting in C++11 (aka C++0x?) you don't even have to make such a class yourself.  You can just use the Lambda syntax, and the compiler will autogenerate an anonymous class and instantiate it right there, capturing any values as instance props!



## Anonymous Code: Lambdas and Blocks

Now, that's not to say C++ hasn't evolved.  Not content to just sit around, Apple introduced Blocks with Clang, and C++11 itself introduced Lambdas.


### C++ Lambdas

1. https://msdn.microsoft.com/en-us/library/dd293608.aspx
2. http://en.cppreference.com/w/cpp/language/lambda

From here, we see that there are 4 forms:
- Full form: `[Captures]<TParamsOptional>(Params) ExceptionSpec -> ReturnType { Body }`
- Untemplated: `[Captures](Params) -> ReturnType { Body }`
- Automatic Return Type: `[Captures](Params) { Body }`
- Unparametrized: `[Captures] { Body }`

#### Captures

- `[&]` captures any automatic vars in the body by reference, and `this` by reference if present.
- `[=]` captures any automatic vars in the body by copy, and `this` by reference if present.
- `[a, &b]` captures `a` by copy, and `b` by reference.
- `[this]` captures `this` by reference.
- `[]` captures nothing!

There are some variables that can be used without capture, but these are mostly static or non-local things like global vars.

The best part is that the untemplated form on down are supported by the default flags used by Arduino's IDE!  Yay!

#### Accepting Lambdas as Parameters

1. https://stackoverflow.com/questions/6458612/c0x-proper-way-to-receive-a-lambda-as-parameter-by-reference
2. https://www.osletek.com/pg/290/Passing_Lambda_functions_as_arguments_in_C++_functions

When just assigning lambdas to local variables, you can use the fancy new `auto` type to have the compiler deduce the type for you.  But, you cannot use `auto` as a type for a function parameter.  How to pass a lambda to a function then?

Looking at 1 and 2, the only consistent way to specify a Lambda parameter seems to be: `std::function<RETURN_TYPE (PARAMS_LIST)>`.  For example: `std::function<int (int, int)>` A lambda taking 2 `int`s and returning an `int`.
