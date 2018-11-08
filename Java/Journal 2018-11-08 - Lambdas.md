Lambdas in Java
===============

Mmmmm functions.

1. [A quick overview][ss-1]
    1. Notes that [Lambdas are Instances of Functional Interfaces][ss-1-1].
2. [Oracle tutorial][ss-2]
3. [Oracle docs on `@FunctionalInterface`][ss-3]

As shown in [(Ss 1)][ss-1] and [(Ss 1.1)][ss-1-1], a Lambda in Java is an Intsance of a Functional Interface.  What's a Functional Interface?  Any `interface` which has one and only one method declared.  The [`@FunctionalInterface` annotation][ss-3] can be used to enforce this at the compiler level, but as noted there, the compiler will treat any Interface with only one Method as a Functional Interface.

Then, any Lambda created for use with that Functional Interface is created as an Object implementing that Interface, with that one Method containing the specified functionality.  Thus, to actually execute the Lambda, you call that method as defined in the interface.  Less fluent than C++ overriding the `()` operator, but also less obnoxious to write.



[ss-1]: https://www.geeksforgeeks.org/lambda-expressions-java-8/
[ss-1-1]: https://www.geeksforgeeks.org/functional-interfaces-java/
[ss-2]: https://docs.oracle.com/javase/tutorial/java/javaOO/lambdaexpressions.html
[ss-3]: https://docs.oracle.com/javase/8/docs/api/java/lang/FunctionalInterface.html
