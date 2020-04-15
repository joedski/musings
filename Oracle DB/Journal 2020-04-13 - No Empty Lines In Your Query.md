---
tags:
    - dbms:oracledb
    - sqlplus
---

Journal 2020-04-13 - No Empty Lines In Your Query
========

I ran a script then received an error stating `SP2-0734: unknown command beginning "'00001237-..." - rest of line ignored.`

My script looked like this:

```sql
SELECT ID, STATUS
FROM MY_SCHEMA.SOME_TABLE
WHERE ID IN (
    -- Group A
    '00001234-0000-1111-2222-333344445555', -- User beep
    '00001235-0000-1111-2222-333344445555', -- User boop
    '00001236-0000-1111-2222-333344445555', -- User bap

    -- Group B
    '00001237-0000-1111-2222-333344445555', -- User borp
    '00001238-0000-1111-2222-333344445555', -- User blop
    '00001239-0000-1111-2222-333344445555' -- User bing
)
;
```

And there were errors for every subsequent line, as well:

```
SP2-0734: unknown command beginning "'00001237-..." - rest of line ignored.
SP2-0734: unknown command beginning "'00001238-..." - rest of line ignored.
SP2-0734: unknown command beginning "'00001239-..." - rest of line ignored.
SP2-0734: unknown command beginning ")" - rest of line ignored.
```

When I removed the blank line before `-- Group B`, the script worked.

So, I guess there's that.  Don't put blank lines in your queries/updates, only between those things.
