Journal 2020-05-20 - Checking If a Record Exists For Better User Messaging
========

I like my scripts to actually give me helpful error messages.  In one instance, I wanted to check if a record already existed before trying to insert so that I could have the script write out an appropriate error message rather than the terse and not always helpful Oracle error messages.  The reason to check was that I wanted to make sure a user did not show up twice in a list.

For the moment, I've settled on this:

```sql
FOR existing_record IN (
  SELECT rhp.*
  FROM MY_APP.REPORT_HAS_PARTY rhp
  WHERE rhp.REPORT_ID = new_record.REPORT_ID
    AND rhp.USER_ID = new_record.USER_ID
    AND rhp.ROLE = new_record.ROLE
) LOOP
  DBMS_OUTPUT.PUT_LINE(
    '!!!  A record already exists with the given REPORT_ID, USER_ID, and ROLE!'
  );
  RAISE exc_record_exists;
END LOOP;
```

Now, I know, I know, if this is that important, then there should be a constraint.  I don't control the DB constraints, though, at least not yet, so for now I just have to take this into account.  Annoying.



## Things I've Tried


### Plain Select

First, I tried just using a plain `SELECT`, but that ran into two issues:

1. You must actually `SELECT ... INTO` when using a `SELECT` in a block body.  Not using `INTO` is an error.
2. If the record is not found, you get the `NO_DATA_FOUND` exception.  It doesn't tell you that name, though.
    - Allegedly this isn't supposed to be raised if you use an aggregation function, I tried using `COUNT()` and still got it.


### Weird Case When Exists Thing

This ... sorta worked, but is ugly as all get out.

Also, there doesn't really seem to be a way to get booleans into variables, though you can still declare a variable of `BOOLEAN` type.  Why.

```sql
SELECT
  (CASE WHEN EXISTS (
    SELECT rhp.*
    FROM MY_APP.REPORT_HAS_PARTY rhp
    WHERE rhp.REPORT_ID = new_record.REPORT_ID
      AND rhp.USER_ID = new_record.USER_ID
      AND rhp.ROLE = new_record.ROLE
    GROUP BY rhp.ID
  )
    THEN 1
    ELSE 0
  END)
    INTO does_record_exist
FROM DUAL
;

IF does_record_exist = 1 THEN
  DBMS_OUTPUT.PUT_LINE(
    '!!!  A record already exists with the given REPORT_ID, USER_ID, and ROLE!'
  );
  RAISE exc_record_exists;
END IF;
```


### For Loop Raise

This one works, and is simple: If no records are found, the loop body does not execute.  If at least one record is found, an exception is raised.

Only useful if all you want to do is raise an exception, though.

```sql
FOR existing_record IN (
  SELECT rhp.*
  FROM MY_APP.REPORT_HAS_PARTY rhp
  WHERE rhp.REPORT_ID = new_record.REPORT_ID
    AND rhp.USER_ID = new_record.USER_ID
    AND rhp.ROLE = new_record.ROLE
) LOOP
  DBMS_OUTPUT.PUT_LINE(
    '!!!  A record already exists with the given REPORT_ID, USER_ID, and ROLE!'
  );
  RAISE exc_record_exists;
END LOOP;
```


### Actual Exception

I finally gave up and looked up the predefined exceptions, where I find this:

- `NO_DATA_FOUND`: A `SELECT INTO` statement returns no rows, or your program references a deleted element in a nested table or an uninitialized element in an index-by table. SQL aggregate functions such as `AVG` and `SUM` always return a value or a null. So, a `SELECT INTO` statement that calls an aggregate function never raises `NO_DATA_FOUND`. The `FETCH` statement is expected to return no rows eventually, so when that happens, no exception is raised.

Okay, so I should be able to specifically do stuff with `NO_DATA_FOUND`.

Note that I don't want to proceed if any other exception occurs because there might be something else going on and I'd like to bail as soon as possible.

I think this is the most correct, but in terms of pure succinctness, the `FOR LOOP RAISE` thing still wins out.  The main way this wins is that it's much clearer in intent, which is perhaps long term better, even if it means a lot of copy-pasting.

There's probably something I could do with passing cursors around to `does exist` functions or something, but eh.  Each script has to bring it's own stuff anyway, so there's not much use there.

```sql
BEGIN
  SELECT rhp.* INTO existing_record
  FROM MY_APP.REPORT_HAS_PARTY rhp
  WHERE rhp.REPORT_ID = new_record.REPORT_ID
    AND rhp.USER_ID = new_record.USER_ID
    AND rhp.ROLE = new_record.ROLE
EXCEPTION
  WHEN NO_DATA_FOUND THEN NULL;
  WHEN OTHERS THEN RAISE;
END;

IF existing_record.ID IS NOT NULL THEN
  DBMS_OUTPUT.PUT_LINE(
    '!!!  A record already exists with the given REPORT_ID, USER_ID, and ROLE!'
  );
  RAISE exc_record_exists;
END IF;
```
