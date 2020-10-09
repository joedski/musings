Journal 2020-05-20 - Comparing Dates in Oracle DBs
========

Via [this answer](https://stackoverflow.com/a/21157347).

Summary: Use [`TO_DATE`](https://docs.oracle.com/cd/B19306_01/server.102/b14200/functions183.htm).

```sql
SELECT *
FROM MY_APP.FOO
-- Semi-ISO8601, just short of perfection.
WHERE CREATED >= TO_DATE('2020-05-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS')
;
```

For timestamps, you'll want the according function [`TO_TIMESTAMP`](https://docs.oracle.com/cd/B19306_01/server.102/b14200/functions193.htm#i999843) which is basically the same, but for timestamps.

```sql
SELECT *
FROM MY_APP.FOO
-- Semi-ISO8601, just short of perfection.
WHERE CREATED >= TO_TIMESTAMP('2020-05-01 00:00:00.0000000', 'YYYY-MM-DD HH24:MI:SS.FF')
;
```

If dealing with dates as returned by SQL Developer, you'll probably want the format featured in the `TO_TIMESTAMP` page: `'DD-Mon-RR HH24:MI:SS.FF'`

Some databases may be set to return icky 12 hour time, so you'd use this instead: `'DD-MON-RR HH:MI:SS.FF AM'`
