Journal 2021-05-21 - Parametrized Tests in JUnit 4
==================================================

Alas, this project doesn't have JUnit 5, and we can't install things like TestNG which seems to be the current-as-of-writing hotness, so we'll have to suffice with what 4 gives us.

First entry yielded by asking Google for "junit 4 run test method multiple times with different parameters" is:

1. Parametric Testing in JUnit 4: https://stackoverflow.com/questions/36909688/make-junit-runner-run-test-class-multiple-times-with-different-parameters
    1. Starts with `@RunWith(Parameterized.class)`, so may not be directly compatible with our integration tests which use `SpringRunner`...
2. Renaming Parametrized Tests in JUnit 4: https://stackoverflow.com/questions/650894/changing-names-of-parameterized-tests

Well, that's annoying.  No wonder JUnit 5 added a wholely different way to do it.

Okay, so what about with Spring?

1. This answer may be the way to do it, using a base class: https://stackoverflow.com/a/28561473
    1. Annoying, as that comes with all the fun of using base classes for these sorts of setups, namely...
        1. ... that every single combination of basic factors either has to be put into a configurable mega class,
        2. ... or that you end up with NxM base classes for each combination of features.  Ugh.
2. Another answer on the same question, this one creates a `ParametersRunnerFactory` that does `SpringJUnit4ClassRunner` stuff: https://stackoverflow.com/a/51788242
