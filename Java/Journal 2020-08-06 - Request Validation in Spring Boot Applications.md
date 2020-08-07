Journal 2020-08-06 - Request Validation in Spring Boot Applications
========

1. [A good and quick overview from Baeldung](https://www.baeldung.com/spring-boot-bean-validation), though qutie laden with obnoxious ads.
2. [Another good quick overview, basically the same but with Gradle dependency notation and some other usage scenarios](https://reflectoring.io/bean-validation-with-spring-boot/).  There's only so many ways to specify a dependency on `spring-boot-starter-validation`.
    1. This however also includes validation on route handler inputs besides the request body, that is Path and Query Params.



## Dependencies

For this, we'll need a few things, it looks like.

In our `pom.xml` dependencies, we'll need to add the following:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<!-- Must explicitly include this in Spring Boot >= 2.3 -->
<!-- This pretty much just adds a dep on a compatible version
    of Hibernate Validator. -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

For the time being, I'll assume Lombok is installed too because screw accessor boilerplate.



## Implementation

There's two main things that we interface with in our application code: the Controller and the Request Body.


### Implementation: The Controller

I'm starting with the Controller here, because that's where I'd first enter the code when tracing things.

```java
@RestController
public class UserController {

    @PostMapping("/users")
    ResponseEntity<String> addUser(
        @Valid @RequestBody User user
    ) {
        // ... persist the user here.
        return ResponseEntity.ok("User is valid");
    }

    // ... standard constructors / other methods
}
```

The important part to notice here is the `@Valid` annotation.  As noted in the Baeldung tutorial, when annotated with `@Valid`, the argument is validated according to the decorated validations of that class.  Failing validation raises a [MethodArgumentNotValidException](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/MethodArgumentNotValidException.html).


### Implementation: The Domain Class

Now we need to actually define the validation rules.  In this particular example, [Hibernate Validator constraints](http://hibernate.org/validator/) are being used.

> NOTE: I don't like that this is both an entity _and_ the request body, but this is just an illustrative example showing how to apply validation and not an endorsement of any particular application architecture.
>
> That is not to say you cannot apply such validation constraints directly to entity classes themselves.  If your use case calls for it, go ahead.

```java
@Entity
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private long id;

    @NotBlank(message = "Name is mandatory")
    private String name;

    @NotBlank(message = "Email is mandatory")
    private String email;

    // standard constructors / setters / getters / toString
}
```


### Implementation: Exception Handling

It'd be nice to actually surface those validation errors to the client in some way, so let's do just that.  Here's a naive implementation that just hands back a JSON object mapping field names to single errors, defined using the [@ExceptionHandler annotation](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/annotation/ExceptionHandler.html):

```java
@ControllerAdvice
public class ValidationExceptionHandlingControllerAdvice {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleValidationExceptions(
        MethodArgumentNotValidException ex
    ) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        return errors;
    }

}
```

If we wanted to, we could also hand back a list of Field Name + Message entries to allow for more than one error per field name, for instance.
