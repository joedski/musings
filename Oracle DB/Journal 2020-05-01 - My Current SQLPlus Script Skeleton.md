Journal 2020-05-01 - My Current SQLPlus Script Skeleton
========

At the moment, I've settled on a combination of bash script and SQL.  The bash script is used to provide a more user-friendly veneer by printing things like help messages and checking parameters.  It can even check the formats of those parameters if you're feeling particularly frisky.

The bash script usually looks something like this.  Note that one parameter the SQLPlus script is expecting is a UUID, and that the bash script generates one on the fly.

```bash
#!/bin/bash

if (( $# != 2 )); then
  echo "
Add a role to a given user.

Usage: \$0 <record_creator_id> <user_id> <user_role>

  <creator_id>
    User ID of the user who (supposedly) created this record.

  <user_id>
    User ID of the user to give the role to.

  <user_role>
    Name of the role.  One of the following:
      Admin
      Owner
      User
"
  exit 0
fi

creator_id=$1
user_id=$2
user_role=$3

bash ./test-formats.bash \
    creator_id user_id   "$creator_id" \
    user_id    user_id   "$user_id" \
    user_role  user_role "$user_role" \
|| exit 1

bash ./sqlplus.bash <<EOF
@add-user-role.sqlplus '$creator_id' '$(uuidgen)' '$user_id' '$user_role'
EOF
```

The SQL script that goes with it, which I explicitly name "sqlplus" scripts to be clear just what kind it is, look like this:

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

DECLARE
  new_record_creator_id MY_APP.USER_ROLE.CREATE_USER%TYPE := '&1';
  new_record_id MY_APP.USER_ROLE.INTERNAL_ID%TYPE := '&2';
  new_record_user_id MY_APP.USER.ID%TYPE := '&3';
  new_record_user_role MY_APP.ROLE.NAME%TYPE := '&4';

  new_record_creator_internal_id MY_APP.USER.INTERNAL_ID%TYPE;
  new_record_user_internal_id MY_APP.USER.INTERNAL_ID%TYPE;
  new_record_role_internal_id MY_APP.ROLE.INTERNAL_ID%TYPE;
  new_record_timestamp MY_APP.USER_ROLE.CREATE_DATE%TYPE := CURRENT_TIMESTAMP;

  new_record MY_APP.USER_ROLE%ROWTYPE;
BEGIN
  -- Ensure we have a clean slate.
  COMMIT WORK;
  -- Begin a new transaction explicitly.
  SET TRANSACTION READ WRITE;

  BEGIN
    SELECT INTERNAL_ID INTO new_record_user_internal_id
    FROM MY_APP.USER
    WHERE ID = new_record_user_id
    ;
  EXCEPTION WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE(
      'User: Could not find User where ID ='
      || new_record_user_id
    );
    RAISE;
  END;

  BEGIN
    SELECT INTERNAL_ID INTO new_record_creator_internal_id
    FROM MY_APP.USER
    WHERE ID = new_record_user_id
    ;
  EXCEPTION WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE(
      'Creator: Could not find User where ID ='
      || new_record_creator_id
    );
    RAISE;
  END;

  BEGIN
    SELECT INTERNAL_ID INTO new_record_role_internal_id
    FROM MY_APP.ROLE
    WHERE NAME = new_record_user_role
    ;
  EXCEPTION WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE(
      'Could not find Role where NAME ='
      || new_record_user_role
    );
    RAISE;
  END;

  new_record.creator_id := new_record_creator_internal_id;
  new_record.modifier_id := new_record_creator_internal_id;
  new_record.user_id := new_record_user_internal_id;
  new_record.role_id := new_record_role_internal_id;
  new_record.create_date := new_record_timestamp;
  new_record.modify_date := new_record_timestamp;

  INSERT INTO MY_APP.USER_ROLE VALUES new_record;

  COMMIT WORK;
EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
END;
/
```

Using records for the values inputs is a bit verbose, but that verbosity makes it a lot easier to read when I come back to it next week.  The exceptions for each select also tell me which thing failed due to lack of data.

The only downside for Record variables is that you can't initialize fields in the `DECLARE` block, at least not field-wise.  You might be able to initialize them all at once, but that's annoying.

A transaction is a bit much for a single mutation, but when dealing with multiple mutations or a whole bunch of reads it adds much needed peace of mind.



## Subprogramming: Functions and Procedures

Sometimes it's useful to put those blocks into Functions or Procedures.  The difference between the two is subtle but important:

- Functions are invoked with expressions, and must return a value.
- Procedures are invoked with statements, and do not return a value.

Both can be used to get values back from queries, but it's a matter of how those values are given back to the call site.  Functions use a `RETURN` statement, while Procedures use an `OUT` parameter. (optionally the parameter could be `IN OUT`, though I haven't yet found a case where I need that that isn't better done with separate `IN` and `OUT` params.  Maybe a state parameter would use `IN OUT`, though.)

Here's a quick sketch:

```sql
set autocommit off;
set serveroutput on;
set echo off;

DECLARE
  sought_user_id MY_APP.USER.ID%TYPE := '&1';
  sought_user_internal_id MY_APP.USER.INTERNAL_ID%TYPE;

  -- A function which returns the desired value.
  FUNCTION find_user_internal_id_func (
    user_id MY_APP.USER.ID%TYPE
  )
  RETURN MY_APP.USER.INTERNAL_ID%TYPE
  AS
    -- Declare anything else here.
    -- Sometimes a return value variable is needed, for instance.
    user_internal_id MY_APP.USER.INTERNAL_ID%TYPE;
  BEGIN
    SELECT INTERNAL_ID INTOR user_internal_id
    FROM MY_APP.USER
    WHERE ID = user_id
    ;

    RETURN user_internal_id;

    -- You can have an EXCEPTION section here, if necessary.
  END;

  -- A procedure that passes the desired value back out
  -- by setting the value in the second parameter.
  PROCEDURE find_user_internal_id_proc (
    user_id MY_APP.USER.ID%TYPE,
    -- NOTE: This is marked as an OUT parameter.
    user_internal_id OUT MY_APP.USER.INTERNAL_ID%TYPE
  )
  IS
    -- This procedure doesn't need any internal variables,
    -- but you can declare them here.
  BEGIN
    -- This will store the value at the variable ref
    -- passed in the second parameter.
    SELECT INTERNAL_ID INTOR user_internal_id
    FROM MY_APP.USER
    WHERE ID = user_id
    ;

    -- You can have an EXCEPTION section here, if necessary.
  END;

  -- A simple procedure that just prints stuff.
  PROCEDURE print_user_message (
    user_id MY_APP.USER.ID%TYPE,
    user_internal_id MY_APP.USER.INTERNAL_ID%TYPE
  )
  IS
  BEGIN
    DBMS_OUTPUT.PUT_LINE(
      'User with ID = ' || user_id
      || ' is INTERNAL_ID = ' || user_internal_id
    );
  END;
BEGIN
  COMMIT WORK;
  SET TRANSACTION READ ONLY;

  -- Let's use the Function.
  sought_user_internal_id := find_user_internal_id_func(sought_user_id);
  print_user_message(sought_user_id, sought_user_internal_id);

  -- Reset the value we're finding.
  sought_user_internal_id := NULL;

  -- Now let's use the Procedure.
  find_user_internal_id_proc(sought_user_id, sought_user_internal_id);
  print_user_message(sought_user_id, sought_user_internal_id);

  COMMIT WORK;
EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
END;
```
