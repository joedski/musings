Journal 2021-04-09 - Storing Tables of Results in PL SQL
========

Initial research:

1. A few answers here: https://stackoverflow.com/questions/16967199/fetch-multiple-rows-and-store-in-1-variable-oracle-stored-procedure
    1. [Declaring a record variable and using its type in a table type declaration](https://stackoverflow.com/a/16967851)
    2. [Something something `wm_concat(...)`](https://stackoverflow.com/a/17152329)?
2. Probably more useful, [actual documentation on `SELECT ... INTO ...` and, specifically, `SELECT ... BULK COLLECT INTO ...`](https://docs.oracle.com/cd/B14117_01/appdev.101/b10807/13_elems045.htm)

A quick example of just dumping a whole result set into a variable:

```sql
-- Not really important when using a block, but better safe than sorry.
-- This is more of an sqlplus thing.
set autocommit off;
-- View server output with: Menu > View > Dbms Output
-- Make sure it's connected to the server you're running this on!
set serveroutput on;
-- don't echo output.
-- Turn this on if you need to see actual line numbers.
set echo off;

<<script>>
DECLARE
    -- First, declare a table type, usually just using the %rowtype of
    -- the table you want to load results from.
    -- If you're creating a projection (with grouping/aggregation, etc)
    -- then declare a record type first and use its %type here instead.
    TYPE Employees_Table
        IS TABLE OF my_app.employees%ROWTYPE
        INDEX BY PLS_INTEGER;

    employees Employees_Table;
BEGIN

    select *
    bulk collect into script.employees
    from my_app.employees Employees
    where upper(Employees.name) like 'JEFF%'
    ;

    -- Don't use "index", that's a special word.
    for ridx in 1..script.employees.count loop
        dbms_output.put_line(
            script.employees(ridx).first_name || ' ' || script.employees(ridx).last_name
        );
    end loop;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END:
```
