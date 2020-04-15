Journal 2020-04-09 - Transactions, Rollback, and Exceptions in SQLPlus Scripts
========

1. [This answer shows PL/SQL anonymous blocks][so-answer-anon-blocks]
2. [Oracle DB docs on `SET TRANSACTION`][oracle-docs-set-transaction]

[so-answer-anon-blocks]: https://stackoverflow.com/a/22273189
[oracle-docs-set-transaction]: https://docs.oracle.com/cd/B19306_01/server.102/b14200/statements_10005.htm#i2067247

I think this forms a pretty good skeleton for a script that blocks everything together and rolls it back on exceptions.

```sql
-- Only commit when specified, usually at the end of the block.
set autocommit off

BEGIN
    -- ... do stuff here!
    COMMIT;
EXCEPTION WHEN OTHERS THEN
    ROLLBACK;
    RAISE; -- we still want to see the error.
END;
```

As [the one answer][so-answer-anon-blocks] points out, you don't get the `n lines committed` output from such a block, which is annoying.

Another thought is based on just using [`SET TRANSACTION`][oracle-docs-set-transaction]:

```sql
set autocommit off

-- just in case...
COMMIT;

-- name just for logging purposes...
SET TRANSACTION READ WRITE NAME 'doing a thing...';

-- ... do stuff here!

COMMIT;
```

That doesn't rollback on exceptions, though, so maybe both are needed.  Well, not needed technically, if the script is the only thing that's being run.  However, if running potentially multiple scripts, then it's probably prudent to do both of the above things:

```sql
-- Only commit when specified, usually at the end of the block.
set autocommit off

-- just in case...
COMMIT;

BEGIN
    -- name just for logging purposes...
    SET TRANSACTION READ WRITE NAME 'doing a thing...';
    -- ... do stuff here!
    COMMIT;
EXCEPTION WHEN OTHERS THEN
    ROLLBACK;
    RAISE; -- we still want to see the error.
END;
```

Hm.  sqlplus was giving me guff about expecting `WORK` to come after `COMMIT`.  I'll try that, then?  It should have no effect on whether 

```sql
-- Only commit when specified, usually at the end of the block.
set autocommit off

-- just in case...
COMMIT WORK;

BEGIN
    -- name just for logging purposes...
    SET TRANSACTION READ WRITE NAME 'doing a thing...';
    -- ... do stuff here!
    COMMIT WORK;
EXCEPTION WHEN OTHERS THEN
    ROLLBACK;
    RAISE; -- we still want to see the error.
END;
```

Hum.  Perhaps a [PL/SQL language reference](https://docs.oracle.com/cd/E11882_01/appdev.112/e25519/toc.htm) might be good to peruse?

> NOTE: When I first wrote the above, I wasn't quite clear on the way sqlplus actually worked.  To use PL/SQL Blocks with sqlplus, [you need to `RUN` them after you declare them](./Journal%202020-04-15%20-%20Running%20PLSQL%20Blocks%20in%20SQLPlus.md).
>
> ```sql
> BEGIN
>     -- do things...
>     -- do more things...
> EXCEPTION WHEN OTHERS THEN
>     ROLLBACK;
>     RAISE;
> END;
> 
> run
> ```
>
> Often a `/` is used instead, as that is an alias for `RUN`.

