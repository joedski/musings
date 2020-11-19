Journal 2020-11-03 - Debugging Oracle SQL Procedures in SQL Developer By Logging Vars
========

I don't know of a way to get a pausable debugger so here's the poor person's debugger: log lines.

1. Get the stored procedure source code.
2. Wrap it in an anonymous block.
3. Add a block var for each out-parameter.
4. Add log lines to show the values of variables in the procedure at various points in time.
5. Enable DBMS Output.
6. Execute the procedure and log the results.

Step 1 is fairly obvious, so I won't go into that as that involves people and talking to them.



## Step 2: Wrap The Procedure In An Anonymous Block

PL/SQL supports a notion of Anonymous Blocks.  They look something like this:

```sql
DECLARE
  -- block vars, local types, procedures, functions, etc, go here.
BEGIN
  -- stuff happens here!
END;
```

Suppose we have some procedure `PROCEDURE FOO_BAR(foo IN VARCHAR, bar IN VARCHAR, zap OUT VARCHAR, ding OUT VARCHAR)`... The block would look something like this:

```sql
DECLARE

  PROCEDURE FOO_BAR(
    foo IN VARCHAR,
    bar IN VARCHAR,
    zap OUT VARCHAR,
    ding OUT VARCHAR
  )
  IS
    -- ... procedure variables.
  BEGIN
    -- ... procedure body.
  EXCEPTION
    -- ...
    WHEN OTHERS RAISE;
  END;

BEGIN

  FOO_BAR(
    'Foo',
    'BarBarBarBar',
    -- out vars.
  );

  -- ... output?

END;
```


### Do Not Add an Exception Section!

You could also have an `EXCEPTION` section before the `END` of the block, but for this you don't really need it, and in fact don't really want it: if you let the exception propagate up as is, you get line numbers, including the line that actually caused the exception!

Seeing this:

```
Error report -
ORA-06502: PL/SQL: numeric or value error: character string buffer too small
ORA-06512: at line 416
ORA-06512: at line 343
ORA-06512: at line 420
06502. 00000 -  "PL/SQL: numeric or value error%s"
*Cause:    An arithmetic, numeric, string, conversion, or constraint error
           occurred. For example, this error occurs if an attempt is made to
           assign the value NULL to a variable declared NOT NULL, or if an
           attempt is made to assign an integer larger than 99 to a variable
           declared NUMBER(2).
*Action:   Change the data, how it is manipulated, or how it is declared so
           that values do not violate constraints.
```

Is far more helpful than seeing this:

```
Error report -
ORA-20105: UNKNOWN ERROR-6502-ORA-06502: PL/SQL: numeric or value error: character string buffer too small
ORA-06512: at line 416
```

Here, the only line we see is the `RAISE` line, usually the `RAISE_APPLICATION_ERROR` line.  Instead, just use `RAISE` without any args, and while there'll be an extra line number in there, the underlying line that threw the error will still be present, which is what we need.  Or, don't even handle other exceptions and let the base error propagate up by itself.



## Step 3: Add a Block Var For Each Out-Parameter

We want a place to store all our out parameters so we can log them out, which means we need to declare those as block vars:

```sql
DECLARE

  -- Block vars!
  out_zap VARCHAR(4096);
  out_ding VARCHAR(4096);

  PROCEDURE FOO_BAR(
    foo IN VARCHAR,
    bar IN VARCHAR,
    zap OUT VARCHAR,
    ding OUT VARCHAR
  )
  IS
    -- ... procedure variables.
  BEGIN
    -- ... procedure body.
  EXCEPTION
    -- ...
    WHEN OTHERS THEN RAISE;
  END;

BEGIN

  FOO_BAR(
    'Foo',
    'BarBarBarBar',
    out_zap,
    out_ding
  );

  -- ... output?

END;
```



## Step 4: Add Log Lines To Show Values

For Oracle, we use `DBMS_OUTPUT.PUT_LINE()` to put a line to the output buffer.

```sql
DECLARE

  -- Block vars!
  out_zap VARCHAR(4096);
  out_ding VARCHAR(4096);

  PROCEDURE FOO_BAR(
    foo IN VARCHAR,
    bar IN VARCHAR,
    zap OUT VARCHAR,
    ding OUT VARCHAR
  )
  IS
    -- ... procedure variables.
    foo_bar_id VARCHAR(64);
  BEGIN
    DBMS_OUTPUT.PUT_LINE('[FOO_BAR]: Begin!');

    -- ...

    SELECT id INTO foo_bar_id
    FROM FOO_BAR
    WHERE FROM_ID = foo;

    DBMS_OUTPUT.PUT_LINE('[FOO_BAR/SELECT id INTO foo_bar_id]: foo_bar_id = ''' || foo_bar_id || '''');

    -- ...
  EXCEPTION
    -- ...
    WHEN OTHERS THEN
      -- Log so we know from the output an exception occurred...
      DBMS_OUTPUT.PUT_LINE('[FOO_BAR/EXCEPTION/WHEN OTHERS THEN]: ' || SQLCODE || ': ' || SQLERRM);
      -- ... But re-raise the original exception so we can keep the line numbers.
      RAISE;
  END;

BEGIN

  FOO_BAR(
    'Foo',
    'BarBarBarBar',
    out_zap,
    out_ding
  );

  DBMS_OUTPUT.PUT_LINE('-------- Results --------')
  DBMS_OUTPUT.PUT_LINE('out_zap = ''' || out_zap || '''');
  DBMS_OUTPUT.PUT_LINE('out_ding = ''' || out_ding || '''');

END;
```

I like to have some indication of where in the procedure each line is, so I include a short context path with the saliant parts to make it easier for me to navigate the body later.  If nothing else, it makes each line easier to distinguish.



## Step 5: Enable DBMS Output

In SQL Developer, this is done by going to Menu "View" > "DBMS Output" to get that pane, then clicking the green "+" icon to actually connect to the DB.

In sqlPlus, this is done by setting `SET SERVEROUTPUT ON`.



## Step 6: Execute the Procedure and Log the Results!

This is the easy part: just execute the script as you normally would in which ever program you use.  You should see lines like:

```
[FOO_BAR/SELECT id INTO foo_bar_id]: foo_bar_id = 'abc-123/1'
```

In the DBMS Output pane.
