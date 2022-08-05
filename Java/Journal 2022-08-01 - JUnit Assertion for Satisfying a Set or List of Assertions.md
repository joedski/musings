Journal 2022-08-01 - JUnit Assertion for Satisfying a Set or List of Assertions
===============================================================================

```java
  private <T> Consumer<List<T>> eachAssertionExactlyInAnyOrder(Consumer<T>... assertions) {
    return actual -> {
      assertThat(actual)
        .withFailMessage("Expected number of elements %d to match number of assertions %d", actual.size(), assertions.length)
        .hasSize(assertions.length);

      Set<Consumer<T>> assertionSet = new HashSet<>(Arrays.asList(assertions));

      for (Consumer<T> eachAssertion : assertions) {
        assertThat(actual).anySatisfy(someElem -> {
          assertThat(someElem).satisfies(eachAssertion);
          // Mutating within an assertion like this is hinky looking,
          // but this won't be reached if an assertionerror is thrown.
          assertionSet.remove(eachAssertion);
        });
      }

      assertThat(assertionSet)
        .withFailMessage("Expected each element to satisfy an assertion but %d assertions were left unsatisfied", assertionSet.size())
        .hasSize(0);
    };
  }

  private <T> Consumer<List<T>> eachAssertionExactly(Consumer<T>... assertions) {
    return actual -> {
      assertThat(actual)
        .withFailMessage("Expected number of elements %d to match number of assertions %d", actual.size(), assertions.length)
        .hasSize(assertions.length);

      for (int i = 0; i < actual.size(); ++i) {
        assertThat(actual).satisfies(assertions[i]);
      }
    };
  }

  private <T, U> Consumer<T> shouldHaveSomeEntry(String userId, Class<U> resultClass) {
    return actual -> {
      // ...
    };
  }

  // ... etc.

  @Test
  public void shouldDoTheThing() {
    assertThat(someLogRepo.findAll()).satisfies(eachAssertionExactlyInAnyOrder(
      shouldHaveSomeEntry("user_1", SomeFailureException.class),
      shouldHaveSomeEntry("user_2", SomeSuccessResult.class),
      shouldHaveSomeEntry("user_3", OtherSuccessResult.class)
    ));

    assertThat(someOtherRepo.findAll()).satisfies(eachAssertionExactly(
      shouldHaveSomeItem("Foo", "user_1"),
      shouldHaveSomeItem("Foo", "user_2"),
      shouldHaveSomeItem("Beep", "user_3")
    ));
  }
```

Now, true, one should assert on as much as possible, but this at least allows asserting on only known things while leaving annoying things like unmocked `new Date()`s alone.

> Which is actually why you shouldn't just sprinkle `new Date()` through out your entire code base, but that's another topic...
