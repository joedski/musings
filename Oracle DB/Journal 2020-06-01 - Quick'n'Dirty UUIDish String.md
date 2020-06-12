Journal 2020-06-01 - Quick'n'Dirty UUIDish String
========

Project I'm on is storing UUIDs as strings.  I know, I know, don't do that, but that's what's happening, I didn't set it up.

Here's a quick 'n dirty thing to do that, based off stuff learned here: https://oracle-base.com/articles/9i/uuid-9i

Just doing this, I get a hexadecimal sequence in sqlplus, while DBeaver spits back random characters.

```sql
SELECT SYS_GUID() FROM DUAL;
```

If we were storing 128 bit uints, that'd be fine, but that's not what we're doing so I need to format it.

Running it through `RAWTOHEX()` fixes it.

```sql
SELECT RAWTOHEX(SYS_GUID()) FROM DUAL;
```

Of course, that gives it in all caps and our UUIDs are lower case, so let's slap `LOWER()` on that.

```sql
SELECT LOWER(RAWTOHEX(SYS_GUID())) FROM DUAL;
```

We still need separators, though.

```sql
DECLARE
  FUNCTION sys_guid_string
  RETURN VARCHAR2
  AS
    result VARCHAR2(32);
  BEGIN
    result := RPAD(LOWER(RAWTOHEX(SYS_GUID())), 32, '0');
    RETURN (
      SUBSTR(result, 1, 8)     || '-'
      || SUBSTR(result, 9, 4)  || '-'
      || SUBSTR(result, 13, 4) || '-'
      || SUBSTR(result, 17, 4) || '-'
      || SUBSTR(result, 21, 12)
    );
  END sys_guid_string;
BEGIN
  DBMS_OUTPUT.PUT_LINE(sys_guid_string());
END;
```
