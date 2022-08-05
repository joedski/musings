Journal 2022-04-05 - First Experience with MockMvc in SpringRunner Unit Tests
=============================================================================

After tooling around with things, I came up with something like this:

```java
// NOTE: Violates common naming conventions by giving a package/dir a Pascal Case name.
// This is to keep it the same shape as the class itself.
package integrationtests.com.example.FooControllerMethods;

// ...
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
// ...
import org.hamcrest.Matchers;
// ...

@RunWith(SpringRunner.class)
@SpringBootTest(classes = ExampleApplication.class)
@Transactional("exampleTransactionManager")
@AutoConfigureMockMvc
// Test file for the FooController.doTheThing() method.
public class DoTheThingTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Test
    public void getNoUsers() throws Exception {
        mockMvc.perform(
            get("/api/users")
        )
            .andExpect(status().isOk())
            // NOTE: Most of the time I don't have access to Java 14, so
            // all of my JSON is going to be in concatenated strings.
            // NOTE 2: This expectation lets you use single quotes instead of
            // double quotes for keys and strings, which isn't quite JSON but
            // it eliminates all the backslashes you'd need otherwise so I'm
            // all for it.
            .andExpect(content().json("[]"))
            ;
    }

    @Test
    public void getTwoUsers() throws Exception {
        givenUser("Johnny Gitaxias");
        givenUser("Uwurabrask");

        mockMvc.perform(
            get("/api/users")
        )
            .andExpect(status().isOk())
            // I found this to be the easist way to make assertions on JSON
            // without having to write out giant strings.
            // This is especially important on older versions of Java that
            // don't support multi-line strings.
            .andExpect(jsonPath("$", Matchers.containsInAnyOrder(Arrays.asList(
                Matchers.allOf(
                    Matchers.hasEntry("id", givenUser("Johnny Gitaxias").getId()),
                    Matchers.hasEntry("name", "Johnny Gitaxias")
                ),
                Matchers.allOf(
                    Matchers.hasEntry("id", givenUser("Uwurabrask").getId()),
                    Matchers.hasEntry("name", "Uwurabrask")
                )
            ))))
            ;
    }

    @Test
    public void getOneUserByName() throws Exception {
        givenUser("Johnny Gitaxias");
        givenUser("Uwurabrask");

        mockMvc.perform(
            get("/api/users")
            .param("name", "Uwurabrask")
        )
            .andExpect(status().isOk())
            .andExpect(/*...*/)
            ;
    }

    // Helpers...

    private AppUser givenUser(String userName) {
        try {
            return expectedUser(userName);
        } catch (ExpectedTestEntityNotFoundException e) {
            AppUser user = new AppUser();

            user.setUserName(userName);
            // any other init here...

            return appUserRepository.save(user);
        }
    }

    private AppUser expectedUser(String userName) {
        AppUser user = appUserRepository.findByUserName(userName);

        if (user != null) {
            return user;
        }

        throw ExpectedTestEntityNotFoundException(AppUser.class, fields -> {
            fields.put("userName", userName);
        });
    }

}
```

That `ExpectedTestEntityNotFoundException` exception itself might look something like following.  I made it a Runtime Exception becuase I didn't want to pollute any `throws` declarations, but the test should still fail if it occurs.  We should never actually expect it in any of our tests.

```java
class ExpectedTestEntityNotFoundException extends RuntimeException {
    private Class<?> entityClass;
    private LinkedHashMap<String, Object> fields;

    public static String formatMessage(Class<?> entityClass, Map<String, Object> fields, Throwable cause) {
        StringBuilder entityThing = new StringBuilder();

        entityThing.append(entityClass.getSimpleName());
        entityThing.append("(");

        fields.forEach((key, value) -> {
            String valueRepr = value == null ? "null" : value.toString();
            entityThing.append(key).append("=").append(valueRepr).append(", ");
        });

        entityThing.delete(entityThing.length() - 2, entityThing.length());
        entityThing.append(")");

        if (cause != null) {
            return String.format(
                "Expected test entity %s not found: %s",
                entityThing.toString(),
                cause.toString()
            );
        }

        return String.format(
            "Expected test entity %s not found",
            entityThing.toString()
        );
    }

    public ExpectedTestEntityNotFoundException(
        Class<?> entityClass
    ) {
        this(entityClass, fields -> {});
    }

    public ExpectedTestEntityNotFoundException(
        Class<?> entityClass,
        Consumer<Map<String, Object>> setFields
    ) {
        LinkedHashMap<String, Object> fields = new LinkedHashMap<>();
        setFields.accept(fields);

        super(formatMessage(entityClass, fields, null));

        this.entityClass = entityClass;
        this.fields = fields;
    }

    public ExpectedTestEntityNotFoundException(
        Class<?> entityClass,
        Throwable cause
    ) {
        this(entityClass, fields -> {}, cause);
    }

    public ExpectedTestEntityNotFoundException(
        Class<?> entityClass,
        Consumer<Map<String, Object>> setFields,
        Throwable cause
    ) {
        LinkedHashMap<String, Object> fields = new LinkedHashMap<>();
        setFields.accept(fields);

        super(formatMessage(entityClass, fields, cause), cause);

        this.entityClass = entityClass;
        this.fields = fields;
    }
}
```

Helpers are usually written in pairs to make copy/pasting easier, though not every test really needs both of these.  In such cases we can just skip `expected...` part entirely, or fold the get-existing-or behavior from the `expected...` part into the `given...` form itself.  However, I think that the more critical the test the more the `given/expected` pairing matters for preventing lack-of-diligence mistakes.

Where the `expected...` forms are useful is where we need to write assertions on existing data that we don't or can't know the value of before hand, most commonly Generated Values such as DB IDs.  This lets us write things like `expectedUser("Johnny Gitaxias").getId()` without having to mock out any generation logic.

Lastly, outside of very exceptional scenarios where we might need to insert hundreds or thousands of test data all at once, we can freely insert and query items one at a time because the database is local if not in-memory and thus extremely cheap to send queries to.

```java
private AppUser givenUser(String userName) {
    try {
        return expectedUser(userName);
    } catch (ExpectedTestEntityNotFoundException e) {
        AppUser user = new AppUser();

        user.setUserName(userName);
        // any other init here...

        return appUserRepository.save(user);
    }
}

private AppUser expectedUser(String userName) {
    AppUser user = appUserRepository.findByUserName(userName);

    if (user != null) {
        return user;
    }

    throw ExpectedTestEntityNotFoundException(AppUser.class, fields -> {
        fields.put("userName", userName);
    });
}

private List<HasUnderling> givenUserHasUnderlings(
    AppUser user,
    Follower... followers
) {
    List<HasUnderling> hasUnderlingList = new ArrayList<>();

    for (Follower follower : followers) {
        hasUnderlingList.add(givenUserUnderling(user, follower));
    }

    return hasUnderlingList;
}

private HasUnderling givenUserHasUnderling(
    AppUser user,
    Follower follower
) {
    try {
        return expectedUserHasUnderling(user, follower);
    } catch (ExpectedTestEntityNotFoundException e) {
        // ... creation logic
        return hasUnderling;
    }
}

private HasUnderling expectedUserHasUnderling(AppUser user, Follower follower) {
    // ...
}
```
