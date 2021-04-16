Journal 2021-04-09 - Running PL SQL Scripts in SQL Developer
========

[Just a few things to do](https://stackoverflow.com/questions/18463496/how-to-run-pl-sql-program-in-oracle-sql-developer/41690865)

1. Open the "Dbms Output" pane, probably under \[Menu > View > Dbms Output].
2. Then make sure "Dbms Output" is connected to the DB you want to run scripts on.
3. Bring in your script or start a new worksheet in the SQL Worksheet editor.
4. Select the same target DB for running it on.
5. Hit the "Run" button. (Not the "Run Statement" button, the "Run All")

> NOTE: It seems that Script Output also logs any of this, so maybe the only thing you need is `set serveroutput on`?  If so, that's nice, because the "Dbms Output" pane is a pain.

Note that SQL Developer lets you use `:arg_name` parametrizations.

There is a major down side to running a whole PL SQL script or even a single Block, and that is that _you don't get table-results for any queries you run_.  A grave deficiency, but I suppose if you're running a Block then that's not really what you're looking for.  Unless you are, because you wanted some decision logic, which is annoying.  Such are things as they are now.

You do get some nice things despite that, though:

1. You get [`Returning Into` and `Returning Bulk Collect Into`](https://docs.oracle.com/cd/B19306_01/appdev.102/b14261/returninginto_clause.htm) on `Insert`, `Update`, `Delete`, and `Execute Immediate`.
2. Logic branches, of course.
3. Exceptions with line numbers (if you don't rethrow them like a numpty.)

```sql
-- by default, sqlplus autocommits after each mutating statement,
-- though that really only applies outside of blocks.
set autocommit off;
-- tell sqlplus to tell the DB system it should send us
-- all output immediately.
set serveroutput on;
-- don't echo output.
-- Turn this on if you need to see actual line numbers.
set echo off;

-- We can do this since we're running the whole script and not just snippets out of it.
ALTER SESSION SET TIME_ZONE = '+00:00';

-- Declared variables can be accessed as `script.foo`
<<script>>
DECLARE
    -- Variables, functions, procedures, etc.
BEGIN
    -- Stuff!

    -- Swap which thing is commented out when you're sure everything is good.
    rollback;
    -- commit;
EXCEPTION
    WHEN OTHERS
        rollback;
        -- Optionally include extra logging information.
        -- DO NOT REMOVE THIS "RAISE" UNLESS YOU LIKE LOSING DEBUG TRACES.
        RAISE;
END;
```
