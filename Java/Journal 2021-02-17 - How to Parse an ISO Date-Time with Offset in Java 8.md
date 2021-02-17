Journal 2021-02-17 - How to Parse an ISO Date-Time with Offset in Java 8
========

How to parse the One True Date-Time Format.

[This seems to be the recommended way in Java 8](https://stackoverflow.com/questions/2201925/converting-iso-8601-compliant-string-to-java-util-date/60214805#60214805), at least without bringing in more user friendly libraries:

```java
/**
 * Parse date strings like "2019-10-24T21:45:14.552-04:00" into a Date.
 */
public static Date dateFromIsoDateTime(String isoDateTime) {
    return Date.from(Instant.from(DateTimeFormatter.ISO_OFFSET_DATE_TIME.parse(isoDateTime)));
}
```

If you need to parse other formats, ~~refactor those other people to use ISO 8601 dates~~ check the other convenience formatters on `DateTimeFormatter`, or if you just need to handle the locale date then look for that instead.
