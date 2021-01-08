Journal 2021-01-08 - Java Language Utilities, Parsing and AST Manipulation and Traversal etc
========

Nothing serious yet, just beginning some initial exploration.



## Motivating Use Case

I frequently start by tracing out a tree of execution from a given method to start building a sense of what's going on.  This usually creates a list like the following:

- `FooController#getFooBar()`
    - `GetFooBarUseCase#execute()`
        - `UserService#getUserInfoForRequestingClient()`
        - `FooBarRepository#findById()`
        - `PermissionService#canReadFooBar()`
        - Try/Catch 1:
            - ...

And so on.

This would be pretty easy to do by parsing a java file into an AST and referencing things by their package/class paths and stepping through the function bodies.

This sort of thing probably already exists, but it'd be nice to be able to spin up my own utilities.



## Initial Research

1. [This question on SO](https://stackoverflow.com/questions/1967987/how-to-generate-ast-from-java-source-code) has some nice enumerations in the answers:
    1. Eclipse has a package `org.eclipse.jdt.core.dom` for this sort of thing.  Hm.
        1. Spring Tool Suite is pre-augmented Eclipse and Visual Studio Code's Java support is basically running Eclipse in headless mode.
    2. [OpenJDK's `javac` itself](http://openjdk.java.net/groups/compiler/) is open source, so that could be an option as well.
    3. [Antr](https://www.antlr.org/) is a parser generator that accepts a grammar and creates a parser, and there are Java grammars for it.
    4. There's also something called [Spoon](http://spoon.gforge.inria.fr/) which lets you parse code and query it.
        1. That might be the most immediately relevant.
        2. Allegedly it uses Eclipse's parser internally.  Opportunity for easy use in Eclipse-derivatives?
    5. Something called, fittingly enough, [JavaParser](http://javaparser.org/).
