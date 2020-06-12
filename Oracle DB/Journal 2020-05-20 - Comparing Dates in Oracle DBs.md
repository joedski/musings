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
