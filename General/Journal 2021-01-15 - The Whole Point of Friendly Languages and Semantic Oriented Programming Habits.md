Journal 2021-01-15 - The Whole Point of Friendly Languages and Semantic Oriented Programming Habits
========

The code we write is written for humans and computers.  Not just computers, but _humans and_ computers.

A computer doesn't care if you feed it instructions in machine code, or even directly twiddling gates.  It doesn't care because it's not capable of such. (yet)  It simply does as instructed, according to whatever instructions are in it, and its construction.

We humans on the other hand have finite brains, and while we can learn to handle jumping between machine code and high level languages, having to implement a modern application in machine code is both inefficient and a waste of money.

> Though, if you're doing it just for funsies then you most definitely should.  However, my guess is that during this process, friendly tools will be created until you've created a whole domain specific language which you use to actually implement the end product.  Unless of course it's an Obfuscated Code contest but anyway...

Thus we develop tools: languages (and their attendant compilers) that write instructions for the machines in a way that's easier for humans to read and understand, and that allows humans to attach human-meaningful language and symbols to bundles of instructions that the computer will dutifully execute, regardless of whether they're bundled together or written individually as long as they're in the correct order.

This further extends to how we use the languages, hence all of the discussion about proper naming, breaking code into paragraphs, keeping individual units (words and phrases) short and digestible so that they can be easily parsed when put together into statements and paragraphs, etc.

> This is also why objects are preferable to methods that take 3+ arguments, whether that be an arguments/parameters object or an object that holds all the various parameters and has various other methods execute in the context of those parameters.
