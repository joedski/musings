Journal 2021-03-08 - HTTP Requests in Plain Java
========

Sources:

1. Stack Overflow question asking this very same thing: https://stackoverflow.com/questions/1359689/how-to-send-http-request-in-java
2. Stack Overflow answer regarding what libraries can be used to _parse_ JSON: https://stackoverflow.com/a/31743324
    1. Though, they support creating JSON too.
    2. Jackson is what work uses: https://github.com/FasterXML/jackson-databind/
        1. For whatever reason I thought it was Jaxson, but apparently not!
    3. Google GSON is also an option: https://github.com/google/gson
    4. Honorable Mentions in comments:
        1. Oracle's JSONP: https://javaee.github.io/jsonp/ previously at https://jsonp.java.net/



## An Attempt with JSON

The answers on [that Stack Overflow question](https://stackoverflow.com/questions/1359689/how-to-send-http-request-in-java) didn't say how to send a JSON body though.  I expect however that we would just `.setRequestProperty("Content-Length", "application/json")` then instead of writing a query string we write the json  at the `DataOutputStream#writeBytes()` step.

```java
public class AppHttpRequests {
  public static String postJson(String targetURL, String jsonPayload) {
    HttpURLConnection connection = null;
    Integer jsonPayloadSize = jsonPayload.getBytes().length;

    try {
      // Create connection

      URL url = new URL(targetURL);
      connection = (HttpURLConnection) url.openConnection();
      connection.setRequestMethod("POST");

      connection.setRequestProperty("Content-Type", "application/json");
      connection.setRequestProperty("Content-Length", Integer.toString(jsonPayloadSize));
      connection.setRequestProperty("Content-Language", "en-US");
      connection.setRequestProperty("Accept", "application/json");

      connection.setUseCaches(false);
      connection.setDoOutput(true);

      // Send request

      DataOutputStream outStream = new DataOutputStream(
        connection.getOutputStream()
      );
      outStream.writeBytes(jsonPayload);
      outStream.close();

      // Get Response

      InputStream inStream = connection.getInputStream();
      BufferedReader reader = new BufferedReader(new InputStreamReader(inStream));
      StringBuilder response = new StringBuilder(); // or StringBuffer if Java version 5+
      String line;

      while ((line = reader.readLine()) != null) {
        response.append(line);
        response.append('\r');
      }

      reader.close();

      return response.toString();
    } catch (Exception e) {
      e.printStackTrace();
      return null;
    } finally {
      if (connection != null) {
        connection.disconnect();
      }
    }
  }
}
```



## What About Parsing?

I'd probably use [Jackson](https://github.com/FasterXML/jackson-databind/) because that's what work uses, so might as well use that unless I'm deliberately learning other things.

Naturally, that'd require adding it as a dependency.

```java
/**
 * Quick-n-dirty singleton thingy.
 */
public class AppJsonProcessor {
  protected static ObjectMapper mapper = new Objectmapper();

  public static <T> parseInto(String json, Class<T> dtoClass) {
    return mapper.readValue(json, dtoClass);
  }

  public static <T> stringify(T dtoClass) {
    return mapper.writeValueAsString(dtoClass);
  }
}
```

Naturally that'd be used like this:

```java
/**
 * The request body for the "query for foo bar by POST" endpoint.
 */
public class FooBarRequest {
  public String name;
}

/**
 * The response body for the "query for foo bar by POST" endpoint.
 */
public class FooBarResponse {
  // Just flaunting the member fields out in public.  Scandalous!
  // If I were writing a longer term project and not a sketch, I'd bring in Lombok
  // to make this a @Data class.
  public String name;
  public String job;
}

public class App {
  public static void main(String[] args) {
    // Change these to whatever, of course.
    // Or read them from `args`!

    String url = "http://example.com/foobar/search";

    FooBarRequest requestBody = new FooBarRequest();
    requestBody.name = "John Singh";

    String requestBodyString = AppJsonProcessor.stringify(requestBody);

    String responseBodyString = AppHttpRequests.postJson(url, requestBodyString);

    FooBarResponse responseBody = AppJsonProcessor.parseInto(responseBodyString, FooBarResponse.class);

    System.out.println(String.format("Job is %s\n"), responseBody.job);
  }
}
```
