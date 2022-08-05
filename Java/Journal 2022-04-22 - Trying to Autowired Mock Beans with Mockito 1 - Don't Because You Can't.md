Journal 2022-04-22 - Trying to Autowired Mock Beans with Mockito 1 - Don't Because You Can't
=======================================================================

After tooling around with things for about an hour, I got to this point...

```java
@RunWith(SpringRunner.class)
@SpringBootTest(classes = {
  ExampleApp.class,
  MockExampleAppSessionUtilSmokeTest.TestConfig.class
})
public class MockExampleAppSessionUtilSmokeTest {

  @Profile("test")
  @Configuration
  public static class TestConfig {

    @Bean
    @Primary
    public ExampleAppSessionUtil mockExampleAppSessionUtil() {
      return Mockito.mock(ExampleAppSessionUtil.class);
    }

  }

  @Autowired
  private ExampleAppSessionUtil exampleAppSessionUtil;

  @Before
  public void beforeEach() {
    Mockito.reset(exampleAppSessionUtil);
  }

  @Test
  public void canMockAppSessionUtil() {

    given(exampleAppSessionUtil.getUserId()).willReturn("Test Id :)");

    assertThat(exampleAppSessionUtil.getUserId()).isEqualTo("Test Id :)");

  }

}
```

Unfortunately, this runs into the following error:

```
java.lang.NoSuchMethodError: org.mockito.MockingDetails.getMockCreationSettings()Lorg/mockito/mock/MockCreationSettings;
 at org.springframework.boot.test.mock.mockito.MockReset.get(MockReset.java:107)
 at org.springframework.boot.test.mock.mockito.ResetMocksTestExecutionListener.resetMocks(ResetMocksTestExecutionListener.java:81)
 at org.springframework.boot.test.mock.mockito.ResetMocksTestExecutionListener.resetMocks(ResetMocksTestExecutionListener.java:69)
 at org.springframework.boot.test.mock.mockito.ResetMocksTestExecutionListener.beforeTestMethod(ResetMocksTestExecutionListener.java:56)
 at org.springframework.test.context.TestContextManager.beforeTestMethod(TestContextManager.java:291)
 at org.springframework.test.context.junit4.statements.RunBeforeTestMethodCallbacks.evaluate(RunBeforeTestMethodCallbacks.java:74)
 at org.springframework.test.context.junit4.statements.RunAfterTestMethodCallbacks.evaluate(RunAfterTestMethodCallbacks.java:86)
 at org.springframework.test.context.junit4.statements.SpringRepeat.evaluate(SpringRepeat.java:84)
 at org.junit.runners.ParentRunner.runLeaf(ParentRunner.java:325)
```

Why's that happening?

Turns out it's because this project is currently still on Mockito 1.9.5, and that method [`MockingDetails.getMockCreationSettings()`](https://site.mockito.org/javadoc/current/org/mockito/MockingDetails.html#getMockCreationSettings()) wasn't added until 2.1.0!  So that was a fun adventure to discover.

Well, we're close to fixing tests to work with Mockito 2.x so we won't even need to worry about this extra beanery, we can just use `@MockBean` like we should've been able to in the first place.



Workaround: If You Can't Mock Directly, Mock The Underlying Data
----------------------------------------------------------------

Ultimately we found a simpler work around until we finally get all the other tests fixed up to work with Mockito 2, and that's to mock out the current `Authentication` value.

Since our shared auth util ultimately is a friendly wrapper around `SecurityContextHolder.getContext().getAuthentication()` and some other things, we can just create a mock `Authentication` and set it in there.

I'm not sure if this is a good idea or not since it takes advantage of internal implementation details of our shared library code, but at the same time the underlying stuff is general across any Spring Boot application.  In the mean time, it gives us time to update the very large test suite to pass in newer versions of JUnit and Mockito.

```java
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = {
  ExampleApp.class,
  MockExampleAppSessionUtilSmokeTest.TestConfig.class
})
public class MockExampleAppSessionUtilSmokeTest {

  @Autowired
  private ExampleAppSessionUtil exampleAppSessionUtil;

  @Before
  public void beforeEach() {
    Authentication auth = Mockito.mock(Authentication.class);
    SecurityContextHolder.getContext().setAuthentication(auth);
  }

  private void givenSessionUserIs(String userId) {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    given(auth.getPrincipal()).willReturn(userId);
  }

  @Test
  public void defaultAuthMockWillHaveNullUserId() {
    assertThat(exampleAppSessionUtil.getUserId()).isNull();
  }

  @Test
  public void configuredAuthMockWillReturnConfiguredValue() {
    givenSessionUserIs(":)");
    assertThat(exampleAppSessionUtil.getUserId()).isEqualTo(":)");
  }

}
```
