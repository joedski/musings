Journal 2021-05-20 - What Basic Skills Should a Developer Have?
========

Trying to think about what it is that's important, for the basics.

1. Competent Coding
    1. Be able to read and explain to others line-by-line what some block of code is doing.  Most of your time programming is spent reading code, so you'd best get good at it.
    1. Be able to summarize the effects of a given block of code on the rest of the system.
    1. Be able to explain limitations in some piece of code.
    1. Be able to think at different levels and scopes and switch between them: Function body or block, vs over all application; at a given instant in time (synchronous), vs across time (asynchronous); etc...
2. Competent Development
    1. Be able to translate from business needs to concrete implementation, and be able to explain why/how the current implementation fulfills the business needs.
    1. Be able to identify ambiguities in business rules/needs, why they're ambiguous, and what needs to be narrowed to resolve them.
3. Competent Thinking
    1. Be able to identify when you don't know something, and begin picking around what it is you don't know.
    1. Know when to reach out to others.
    1. Be able to identify when things are Repeating, or Near-Repeating.
        1. Not just literal copy pastes, but also in processes you engage in.
    1. Be able to recognize cases where you're better off breaking something into Configuration/Data + Execution Engine, or what I like to call separating things into Description and Execution.
        1. Sometimes this is literally creating a constant or config file and writing a general query system against that, sometimes it's an Aspect implementation along with annotations or decorators.
        2. More generally, consideration of code as data, and data as code.
    1. Be able to engage in Scientific Method style experimentation: formulate a hypothesis; create a test to validate or invalidate that hypothesis; then write down the results of the test, whether it validated or invalidated the hypothesis, where your understanding may have been incorrect, ideas for changes to the experiment, etc.
        1. As much as "read the docs" should be enough, sometimes it isn't.  That's annoying, but sometimes you don't know what you don't know, and don't know that you're missing some assumed context.  This can help you learn new things and identify holes in understanding and context.
            2. Any time you run into something with insufficient documentation, consider what you would've really liked to have know.  What did the existing docs not include that you needed?  Is this something you could help with?

Other thoughts

- Did you try a programming language that forced you to write code in another paradigm?  For instance, if you've written only Java or JS, did you try Elm or Haskell?
    - What were your first experiments in this new environment like?
    - Did you initially try to reproduce what you knew, only to find it didn't work?
    - Did you eventually settle into a mode of thinking more idiomatic to the new language?
    - How has this affected the way you write code in your typical programming environment?
