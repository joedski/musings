SQLPlus Script Skeletons
========

Just so prefab skeletons to grab and go.  I guess that makes this a cook book.



## Some Quick Notes

- Oracle's DBs use an extension called PL/SQL which adds some procedural aspects to the SQL language.
- SQLPlus (or sql*plus) does not perform any parsing of PL/SQL on its own, rather its behavior changes modes based on the first elements of a line.
    - Starting a line with `set` or other internal SQLPlus commands performs those commands.
    - Starting a line with a Block element will put it into buffering mode where it will buffer everything you enter.
        - This mode is exited by entering a `.` or `/` on its own line with nothing else besides whitespace.
        - `/` will not only exit this buffering mode, but also send the buffered input to the remote database system to execute.
    - For the most part, I will have internal commands lower case and PL/SQL language constructs upper case.  There's no real reason for this.
- Most scripts will run `set serveroutput on` so that any `DBMS_OUTPUT.PUT_LINE()` will cause the server to immediately spit text back out to SQLPlus.
- There's a slight difference between running a script with `@` and `@@`.
    - [Running a script with `@` ("at" sign)](https://docs.oracle.com/cd/B28359_01/server.111/b31189/ch12002.htm) searches the "current default directory", which usually starts out as the CWD in which `sqlplus` was called.
        - That is, `@` searches relative to the CWD of SQLPlus.
        - Usually, when running a script manually from the SQLPlus prompt, use `@`.
    - [Running a script with `@@` (double "at" sign)](https://docs.oracle.com/cd/B28359_01/server.111/b31189/ch12003.htm) searches searches for the named file starting in the same directory as the script that ran the `@@` command.
        - That is, when a script uses `@@`, SQLPlus searches relative to that script.
        - Thus, usually, when running a script from another script, use `@@` to make sure you path relative to the outer script rather than from SQLPlus's CWD.
        - If used from the SQLPlus prompt, though, the behavior is essentially the same as `@`, where SQLPlus searches relative to the CWD.
    - Note that `@` and `@@` are SQLPlus commands, not PL/SQL statements.  This means you cannot use them in Blocks.



## Current General Purpose Skeleton

- Turns off autocommit, though that's not necessary if you're only reading.
    - Technically I'm not sure it's necessary if everything is wrapped in a block, either.

```sql
set autocommit off;
set serveroutput on;
set echo off;

DECLARE
  -- Declare variables, records, types, procs, etc here.
BEGIN
  COMMIT WORK;
  -- Use "READ WRITE" if you need to mutate anything.
  SET TRANSACTION READ ONLY;

  COMMIT WORK;
-- Only necessary if you're mutating anything.
-- EXCEPTION WHEN OTHERS THEN
--   ROLLBACK;
--   RAISE;
END;
/
```



## Simple Script With Block

- Uses a For Loop with an Implicit Cursor to iterate records.
- Sets a block variable's type as the type of the column `ID` of `MY_SCHEMA.MY_TABLE` using the `%TYPE` annotation.

```sql
set echo off
set serveroutput on

DECLARE
  target_id MY_SCHEMA.MY_TABLE.ID%TYPE := 1;
BEGIN
  FOR res_record IN (
    SELECT *
    FROM MY_SCHEMA.MY_TABLE
    WHERE ID = target_id
  )
  LOOP
    DBMS_OUTPUT.PUT_LINE(
      res_record.ID || ': ' || res_record.NAME
    );
  END LOOP;
END;
/
```


### Variation: Explicit Cursor

- Declares the cursor before using it in the loop.

```sql
set echo off
set serveroutput on

DECLARE
  target_id MY_SCHEMA.MY_TABLE.ID%TYPE = 1;

  CURSOR things_with_target_id IS
    SELECT *
    FROM MY_SCHEMA.MY_TABLE
    WHERE ID = target_id
    ;
BEGIN
  FOR res_record IN things_with_target_id
  LOOP
    DBMS_OUTPUT.PUT_LINE(
      res_record.ID || ': ' || res_record.NAME
    );
  END LOOP;
END;
/
```



## Script With Argument

- The `&1` can be substituted by either passing the argument when doing an `@`/`@@` or when it prompts you to.
    - For instance, in sqlplus you might do `@scripts/show-item-by-id.sql 42` to call this script with `target_id = 42`.

```sql
set echo off
set serveroutput on

DECLARE
  target_id MY_SCHEMA.MY_TABLE.ID%TYPE := &1;
BEGIN
  FOR res_record IN (
    SELECT *
    FROM MY_SCHEMA.MY_TABLE
    WHERE ID = target_id
  )
  LOOP
    DBMS_OUTPUT.PUT_LINE(
      res_record.ID || ': ' || res_record.NAME
    );
  END LOOP;
END;
/
```



## Records as Rows: Reading and Writing Whole Records

- Uses PL/SQL's `SELECT ... INTO ...` syntax.
- Also uses the `%ROWTYPE` annotation to declare a variable as a record with fields corresponding to the target table's columns.

```sql
set echo off
set serveroutput on

DECLARE
  target_id MY_SCHEMA.MY_TABLE.ID%TYPE := &1;
  found_rec MY_SCHEMA.MY_TABLE%ROWTYPE;
BEGIN
  SELECT * INTO found_rec
  FROM MY_SCHEMA.MY_TABLE
  WHERE ID = target_id
  ;

  DBMS_OUTPUT.PUT_LINE(
    found_rec.ID || ': ' || found_rec.NAME
  );
END;
/
```


### Variation: Using a Record To Insert

- Not usually the most useful, but it's there: if your record matches the columns of a given table, you can use it as a `VALUES` target.
    - Bonus: This means you don't need to list the columns after the table you're inserting into.
- Note that `&ref` substitution occurs before script evaluation, so you must quote all inputs if they're meant to be strings.
    - Note that yes that means you can `&ref` a table name.

```sql
set echo off
set serveroutput on

DECLARE
  new_name MY_SCHEMA.MY_TABLE.NAME%TYPE := '&1';
  new_rec MY_SCHEMA.MY_TABLE%ROWTYPE;
BEGIN
  new_rec.ID := 42;
  new_rec.NAME := new_name;

  INSERT INTO MY_SCHEMA.MY_TABLE
  VALUES new_rec
  ;
END;
/
```
