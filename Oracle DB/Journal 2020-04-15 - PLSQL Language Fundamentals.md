---
tags:
    - dbms:oracledb
    - sql:pl/sql
---

Journal 2020-04-15 - PLSQL Language Fundamentals
========

Basically going through [this section of Oracle's PL/SQL manual](https://docs.oracle.com/cd/E11882_01/appdev.112/e25519/fundamentals.htm#LNPLS002) and noting anything I find interesting to better commit it to memory.



## PL/SQL Blocks


### Block Variables

You can declare block variables in an optional `DECLARE` section of a Block.

```sql
-- Label this block as "this_block".
-- Now we can reference block vars as "this_block.whatever".
<<this_block>>
DECLARE
    -- Quoted identifier, not initialized (= null).
    "Foo" NUMBER;
    -- Unquoted identifier (case insensitive),
    -- initialized to 10.
    Bar NUMBER := 10;
    -- Table type...
    TYPE some_nums IS TABLE OF INTEGER INDEX BY PLS_INTEGER;
    Nums some_nums;
BEGIN
    -- You can reassign them...
    "Foo" := 42;

    -- You can use them...
    SELECT ID
    FROM MY_SCHEMA.SOME_TABLE
    WHERE SOME_TABLE.FOO = "Foo"
    ;

    -- Or even select into them...
    SELECT SOME_TABLE.FOO, SOME_TABLE.BAR
    -- Referencing Bar explicitly.
    INTO "Foo", this_block.Bar
    FROM MY_SCHEMA.SOME_TABLE
    WHERE SOME_TABLE.ID = 5
    ;
END;
```



## Subprograms

As someone who's a fan of DRY, this piques my interest.


### Types of Subprograms

First, we may want to see some specific terminology about types of subprograms, or rather specific terms about distinguishing where a subprogram is stored:

> A subprogram created inside a PL/SQL block is a _nested subprogram_. You can either declare and define it at the same time, or you can declare it first and then define it later in the same block (see "Forward Declaration"). A nested subprogram is stored in the database only if it is nested in a standalone or package subprogram.
> 
> A subprogram created inside a package is a _package subprogram_. You declare it in the package specification and define it in the package body. It is stored in the database until you drop the package. (Packages are described in Chapter 10, "PL/SQL Packages.")
> 
> A subprogram created at schema level is a _standalone subprogram_. You create it with the CREATE PROCEDURE or CREATE FUNCTION statement. It is stored in the database until you drop it with the DROP PROCEDURE or DROP FUNCTION statement. (These statements are described in Chapter 14, "SQL Statements for Stored PL/SQL Units.")
> 
> A stored subprogram is either a package subprogram or a standalone subprogram.
>
> — [PL/SQL Subprograms: Nested, Package, and Standalone Subprograms](https://docs.oracle.com/cd/E11882_01/appdev.112/e25519/subprograms.htm#LNPLS99899)

For my purposes of making scripts just that bit more reuasble, or at least more modifyable, I'm probably going to be mostly concerned with Nested Subprograms.

There's also another distinction to make, which is Procedures versus Functions.

- Procedures do not return anything, and instead perform their body and possibly mutate an `OUT` parameter.  You can use the `RETURN` statement, but it's not recommended unless you're exiting the procedure early.
    - Procedure declarations begin with `PROCEDURE`.
- Functions do return a value with the `RETURN` statement.
    - Function declarations begin with `FUNCTION`.


### Structure of Subprograms

There are two main kinds of declarations (more types/kinds!  Yay!):

- Forward Declarations: Only the Heading.
- Implementation Declarations: The Heading and the Body.

If you've ever used any language that doesn't hoist declarations or have all name resolutions lazy, then you've probably had to make forward declarations.  If you don't know what those are then a quick internet search will be most enlightening.

The Body itself consists of a few parts:

- The optional Declarative part, which declares local variables.
- The required Execution part, which actually does stuff.
- The optional Exception Handling part, which does what it says on the tin.

If you've seen the parts of Blocks, then much of this will look very familiar.

```sql
DECLARE
    -- Local variables not part of procedure...
    some_number NUMBER := 0;

    -- A procedure does not return a value,
    -- rather it's more like a parametric statement.
    PROCEDURE print_number (
        n NUMBER
    ) IS
        -- Optional declarative part...
        error_message VARCHAR2(30) := 'That number is too big.';
    -- And now the executable part...
    BEGIN
        IF n > 42 THEN
            DBMS_OUTPUT.PUT_LINE(error_message);
        ELSE
            -- NUMBER auto-coerced to VARCHAR/STRING.
            DBMS_OUTPUT.PUT_LINE('number is ' || n);
        END IF;
    END print_number; -- The end!
    -- Technically the name doesn't need to be repeated,
    -- but it can help keep things clearer.

    -- A function does return a value,
    -- and you'll get a warning if not all branches
    -- return something.
    FUNCTION number_but_bigger (
        n NUMBER
    )
    -- A function must also declare a return type.
    RETURN NUMBER
    -- In some circumstances, you can specify extra options
    -- after the RETURN declaration,
    -- like "DETERMINISTIC" or "PIPELINED".
    -- For details: https://docs.oracle.com/cd/E11882_01/appdev.112/e25519/function.htm#i34368
    -- Functions use "AS" rather than "IS".
    AS
        -- Declaring a local var just for giggles.
        -- This function doesn't really need it.
        n_bigger NUMBER;
    BEGIN
        n_bigger := n + 1;
        RETURN n_bigger;
    END number_but_bigger;
BEGIN
    print_number(some_number);
    -- number is 0

    some_number := 11;
    print_number(some_number);
    -- number is 11

    some_number := 42;
    print_number(number_but_bigger(some_number));
    -- That number is too big.
END;
```



## Type Declarations

Couple topics here I want to cover.

- [User-Defined Subtypes](https://docs.oracle.com/cd/E11882_01/appdev.112/e25519/datatypes.htm#LNPLS99933)
- [Collections and Records](https://docs.oracle.com/cd/E11882_01/appdev.112/e25519/composites.htm#LNPLS005)


### Records

```sql
DECLARE
    TYPE My_Rec IS RECORD (foo INTEGER, bar INTEGER);
    r My_Rec;

    PROCEDURE print_my_rec (r My_Rec) IS
    BEGIN
        DBMS_OUTPUT.PUT_LINE(
            'r.foo = ' || r.foo || '; r.bar = ' || r.bar
        );
    END;
BEGIN
    -- Assigning field-wise.
    r.foo := 1;
    r.bar := 2;

    print_my_rec(r);
    -- r.foo = 1; r.bar = 2

    -- Selecting into, supposing that SOME_TABLE.FOO and SOME_TABLE.BAR
    -- are both just INTEGER.
    SELECT SOME_TABLE.FOO, SOME_TABLE.BAR
    INTO r
    FROM MY_SCHEMA.SOME_TABLE
    WHERE SOME_TABLE.ID = 42
    ;

    print_my_rec(r);
END;
```

You can also use `%TYPE` to reuse the type of a table column:

```sql
DECLARE
    TYPE My_Rec IS RECORD (
        -- Declare My_Rec.foo to be the same type as MY_SCHEMA.SOME_TABLE.FOO
        foo MY_SCHEMA.SOME_TABLE.FOO%TYPE,
        -- Same for My_Rec.bar and MY_SCHEMA.SOME_TABLE.BAR...
        bar MY_SCHEMA.SOME_TABLE.BAR%TYPE
    );
    r My_Rec;

    PROCEDURE print_my_rec (r My_Rec) IS
    BEGIN
        DBMS_OUTPUT.PUT_LINE(
            'r.foo = ' || r.foo || '; r.bar = ' || r.bar
        );
    END;
BEGIN
    -- Using the %TYPE things above, we know this will
    -- always succeed.
    -- Though, if there's no record where ID=42,
    -- then we just get NULLs.
    SELECT SOME_TABLE.FOO, SOME_TABLE.BAR
    INTO r
    FROM MY_SCHEMA.SOME_TABLE
    WHERE SOME_TABLE.ID = 42
    ;

    print_my_rec(r);
END;
```

Aside from `SELECT ... INTO ...`, [PL/SQL also supports `RETURNING ... INTO ...` on `UPDATE`, `INSERT`, and `DELETE`](https://docs.oracle.com/cd/E11882_01/appdev.112/e25519/composites.htm#LNPLS460).

```sql
DECLARE
    TYPE My_Rec IS RECORD (
        -- Declare My_Rec.foo to be the same type as MY_SCHEMA.SOME_TABLE.FOO
        foo MY_SCHEMA.SOME_TABLE.FOO%TYPE,
        -- Same for My_Rec.bar and MY_SCHEMA.SOME_TABLE.BAR...
        bar MY_SCHEMA.SOME_TABLE.BAR%TYPE
    );
    r My_Rec;

    PROCEDURE print_my_rec (r My_Rec) IS
    BEGIN
        DBMS_OUTPUT.PUT_LINE(
            'r.foo = ' || r.foo || '; r.bar = ' || r.bar
        );
    END;
BEGIN
    UPDATE MY_SCHEMA.SOME_TABLE
    SET FOO = 9001, BAR = 42
    WHERE ID = 42
    RETURNING FOO, BAR
    INTO r
    ;

    print_my_rec(r);
END;
```

If you just wanted a record variable that's a row of a given table, you can use `%ROWTYPE`.

```sql
DECLARE
    -- Declare new_record as a RECORD variable
    -- whose field names and types are the column names and types
    -- of the table MY_SCHEMA.SOME_TABLE.
    new_record MY_SCHEMA.SOME_TABLE%ROWTYPE;
BEGIN
    new_record.id := 75000;
    new_record.foo := 1;
    new_record.bar := 1;

    INSERT INTO MY_SCHEMA.SOME_TABLE VALUES new_record;
END;
```

I haven't seen any sugar for assigning multiple fields at once, which is anonying, but oh well.



## The Cursor For Loop: Iterating Selects

Using the [Cursor For Loop](https://docs.oracle.com/cd/E11882_01/appdev.112/e25519/cursor_for_loop_statement.htm#LNPLS1155), you can easily iterate over records of a SELECT statement.  It takes two forms:

- The Select Form: `FOR a_row IN (SELECT ...)`
- The Cursor Form: `FOR a_row IN some_cursor`

The two are very similar, just that the cursor form allows you to separate the SELECT from the loop itself.

Compare these two examples:

```sql
BEGIN
    FOR some_record IN (
        SELECT ID, FOO
        FROM MY_SCHEMA.SOME_TABLE
        WHERE BAR IS NOT NULL
    )
    LOOP
        DBMS_OUTPUT.PUT_LINE(
            '#' || some_record.ID || ' FOO=' || some_record.FOO
        );
    END LOOP;
END;
```

```sql
DECLARE
    CURSOR some_cursor IS
        SELECT ID, FOO
        FROM MY_SCHEMA.SOME_TABLE
        WHERE BAR IS NOT NULL
        ;
BEGIN
    FOR some_record IN some_cursor
    LOOP
        DBMS_OUTPUT.PUT_LINE(
            '#' || some_record.ID || ' FOO=' || some_record.FOO
        );
    END LOOP;
END;
```


### Aside: Cursor Parameters

[Cursors can have parameters](https://docs.oracle.com/cd/E11882_01/appdev.112/e25519/static.htm#i45976)!
