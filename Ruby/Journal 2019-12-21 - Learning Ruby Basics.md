Journal 2019-12-21 - Learning Ruby Basics
========

Last time I actually tried touching Ruby, I wasn't even that fluent with JS and was trying to learn Rails at the same time.  Bad idea!

I'm better now, and not going to try to wedge Rails into there just because it's the latest (or not any more?) hotness.  Rather, there's some other things that use Ruby scripts that I'd like to poke around with.  Mostly RPGMaker, actually.

So, let's go through some basic tutorials then, to learn how things are done.



## Basics

Basics of Ruby plus whatever tangents I go off on I guess.


### Math

Math is pretty standard, though they show off support for the infix exponentiation operator, `**`, which JS only got just recently.  Haskel meanwhile is all "why the hell do you guys distinguish between infix and non-infix?  they're just functions..." but everyone just goes back to doing their own thing when Haskel starts talking like that so eh.

Curiously, in [the page that shows off the exponetiation operator](https://www.ruby-lang.org/en/documentation/quickstart/), they then turn around and use the `Math.sqrt` function instead of using `a ** 0.5`, but I suppose that requires knowing that the n-th root is just `x ** (1/n)`, so eh.  Probably figured most people don't know or care.  (That and `Math.sqrt` may call an optimized version.)

Anyway, nothing remarkable there.  We still have standard order of operations (probably mostly?) rather than things like RPN which of course pollutes everything with precedence but nobody likes RPN because nobody likes writing in Forth so whatever.


### Printing Strings

Strings are print to stdout with `puts()`.  It accepts an argument (or many?) and prints them!

- If you pass nothing, it prints a new line.
- If you pass 1 or more arguments, it prints each one on its own line.

It then returns `nil`.

Not much to say there.


### String Interpolation

String interpolation is done using `#{stuff}`, so:

```ruby
a = "Barghl"
puts "Arghl #{a}"
```

prints `Arghl Barghl` to stdout.


### Functions/Procedures/Subs

You can define a function using `def NAME(ARGS) ... end`:

```ruby
def greet(name)
  puts "Hello #{name}!"
end

greet("Barghl")
```

Note that the parentheses are optional at both definition and call time, so the following are all valid:

```ruby
def no_args
  puts "I have no args and I must scream!"
end

def no_args()
  puts "I have no args and I must scream!"
end

# This invokes the function if it is one.
no_args
# This explicitly invokes the function.
no_args()
```

Notice that in Ruby, a function even of 0 arguments is invoked when referenced directly.  This "bare word" behavior is [noted in this page](http://rubylearning.com/satishtalim/variables_and_assignment.html) and should probably be avoided, though it's not quite as bad as Perl.

Maybe there's a way to get a ref later?  It might just be the key `:no_args` in that case:

```
irb(main):031:0> def hi
irb(main):032:1> puts "Hello"
irb(main):033:1> end
=> :hi
irb(main):034:0> _
```

Ah, but that's for later.

Anyway, the above thing about optional paretheses is true for functions of n args, too.

```ruby
def greet(salutation, name)
  puts "#{salutation}, #{name}!"
end

def greet salutation, name
  puts "#{salutation}, #{name}!"
end

greet "Greetings", "Friend"
greet("Greetings", "Friend")
```

Note however that if you use parentheses, those parens _must_ be cuddled with the function name:

```ruby
def hi salutation, name
  puts "#{salutation}, #{name}"
end

hi("Greetings and salutations", "Friendo")

# Greetings and salutations, Friendo
# => nil

hi ("Greetings and salutations", "Friendo")

# SyntaxError: (irb):55: syntax error, unexpected ',', expecting ')'
# hi ("Greetings and salutations", "Friendo")
#                                 ^
# (irb):55: syntax error, unexpected ')', expecting end-of-input
```

What's happening there?  No idea, yet.  Dunno enough to know what's going on there.


### Classes

The only thing I remember is that Ruby explicitly allows you to bodge new things onto existing classes.  Something either like or the same as monkey patching in JS.  Dunno if that's still considered good practice or not, but it seemed to be when I first looked at it.

Anyway, forget about that, let's just look at classes generally first.  [Here's one](https://www.ruby-lang.org/en/documentation/quickstart/2/):

```ruby
class Greeter
  def initialize(name = "World")
    @name = name
  end
  def say_hi
    puts "Hi #{@name}!"
  end
  def say_bye
    puts "Bye #{@name}, come back soon."
  end
end

g = Greeter.new("Fred")
# => #<Greeter:0x007fd803884b08 @name="Fred">

g.say_hi
# Hi Fred!

g.say_bye
# Bye Fred, come back soon.

gw = Greeter.new
# => <Greeter:0x007fd8030e3f98 @name="World">

g.say_hi
# Hi World!

g.@name
# SyntaxError: (irb):87: syntax error, unexpected tIVAR, expecting '('
```

- Classes are defined with `class PascalCaseName` and ended with `end`.
- Classes have an initializer named `initialize`, similar to JS's `constructor` function I guess.
- You can give function parameters default values with the usual style for that now days.
- Instance properties are assigned in much the same local variables are assigned: they automatically vivify for you.
    - However, Instance Props are referred to with a `@` prefix.  So `@whatever` is similar to JS's `this.whatever`.
- Classes are instantiated by invoking `ClassName.new` as a regular function.
- You cannot access instance properties.  By default they are protected.

How do you access instance prpoerties, then?

```ruby
# NOTE: This assumes you've defined the rest of Greeter using
# the previous example.
class Greeter
  attr_accessor :name
end

g.respond_to? "name"
# => true

g.name
# => "Fred"

g.respond_to? "name="
# => true

g.name = "George"
# => "George"

g
# => #<Greeter:0x007fd803884b08 @name="George">
```

- Here, we can see that we have a method named `respond_to?` which accepts a name and returns if the instance can respond to that method name.
- Remembering that functions are invoked if they are referenced, with or without parens, we can see that the distinction between a property getter or setter and an accessor method is none in Ruby.
- Defining a method named `some_name=` defines a setter for the instance property `some_name`.

We can also see all the own-methods here:

```ruby
# Not passing `false` here causes it to list ALL methods
# up the inheritance chain.
Greeter.instance_methods(false)
# => [:name, :name=, :say_hi, :say_bye]
```

This shows the accessor methods.


### List Iteration

I'm going to skip the mega greeter example because I think it's a bit ridiculous and crams too much together into a big pile of symbol soup if you've not seen much Ruby.  Instead, I'm going to look at List Iteration directly, because that's the only significantly new thing.

```ruby
names = ["Fred", "George"]

names.respond_to? "each"
# => true

names.each do |name|
  "Greetings #{name}!"
end
# Greetings Fred
# Greetings George
# => ["Fred", "George"]
```

So, that's weird.  What does that even mean?  Can we wrap it parens?

```ruby
names.each(do |name|
  "Greetings #{name}!"
end)
# SyntaxError: (irb):111: syntax error, unexpected keyword_do_block, expecting ')'
# names.each(do |name|
#              ^
# (irb):113: syntax error, unexpected keyword_end, expecting end-of-input
```

Nope.  Okay, so this `do |whatever|` thing is not a value.  What _is_ it then?

A Block.

What's that?  [This page](https://www.ruby-lang.org/en/documentation/quickstart/4/) says it's like a lambda that can accept 1 parameter, the parameter between the pipes.  It goes on to say that the `each` method uses `yield whatever` to pass that on to the block and glosses over how the rest of it works.

That's annoying.  Let's find other places, I guess.


### More String Things

[This seems to be a much better overview of random string stuff](http://rubylearning.com/satishtalim/fun_with_strings.html).

Apparently you can run shell commands:

```ruby
puts `ls`
# README.md
# docker-compose.local-dev.yml
# knexfile.js
# ...
# => nil
```

That's mildly frightening.

Can you throw interpolations at it?

```ruby
where = "tests"
puts `ls #{where}`
# functional
# unit
# => nil
```

That's even more frightening.  Good to know.

You can also do more mundane things that probably don't require as much thought about security:

```ruby
# Use double or single quotes.
puts "Hello", 'World!'

# Concat with + (like JS) rather than . (like PHP)
puts "Hello " + 'World!'

# Escape!
puts "Hello \"Friend\"..."

# Repeat with the * operator
puts "Hello" * 3
# HelloHelloHello
# => nil
```

#### String Conversion/Coercion

Other things will have a to_s method called:

```ruby
PI = 3.141592653589
puts "Pi is:", PI

class Warfstash
  def initialize(name = "Wilfred")
    @name = name
  end

  def to_s
    "#{@name} Warfstash"
  end
end

wilfred = Warfstash.new('Wilfred')
marklesparkle = Warfstash.new('Marklesparkle')

def hi name
  # Remember, string interpolation converts to string,
  # which as noted here is done with the to_s instance method.
  puts "Hello #{name}!"
end

hi wilfred
# Hello Wilfred Warfstash!
# => nil

hi marklesparkle
# Hello Marklesparkle Warfstash!
# => nil
```


### The Main Object

Even in the top level, you're always in some object context, and the object context of the top level is `main`:

```ruby
puts self
# main
# => nil
```
