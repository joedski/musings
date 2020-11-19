Journal 2020-11-04 - Conditionally Unique Constraints
========

Can I have a Unique Constraint that applies only when one of the columns has a certain value?  Can this be more broadly applied to any condition?

More specifically, can I use this to create unique constraints in a "soft delete" or "lossess" setup, such as requiring a unique name but only on the "current" versions?  And slightly generally from that, is that the proper way to do that?

[A number of answers seem to indicate "Yes" to both of those](https://stackoverflow.com/questions/21088601/conditional-unique-constraint-with-multiple-fields-in-oracle-db).

[One answer concatenates some fields into a string on the given condition, and returns null otherwise](https://stackoverflow.com/a/21089804), a simplistic but effective solution in cases where it is valid.

```sql
create table XPTO_TABLE (
  id number,
  obj_x varchar2(20),
  date_x date,
  type_x varchar2(20),
  status_x varchar2(20)
);

create unique index xpto_table_idx1 on XPTO_TABLE (
  case
    when status_x <> '5'
      -- Depending on what could appear in the fields, you may need
      -- some extra delimitation.  Normalization could be applied here
      -- too, such as UPPER(), etc.
      then obj_x || date_x || type_x || status_x
    else null
  end
);
```

[Another points out that starting with Oracle 11, you can create virtual columns then apply unique constraints to those](https://stackoverflow.com/a/21090763).  This seems to apply three separate unique constraints, though, which may not always be what you want.

```sql
CREATE TABLE XPTO_TABLE (
  -- The real columns...
  ID INT PRIMARY KEY,
  OBJ_X INT,
  DATE_X DATE,
  TYPE_X VARCHAR2(50),
  STATUS_X INT,

  -- And the virtual columns...
  OBJ_U AS (CASE STATUS_X WHEN 5 THEN OBJ_X ELSE NULL END),
  DATE_U AS (CASE STATUS_X WHEN 5 THEN DATE_X ELSE NULL END),
  TYPE_U AS (CASE STATUS_X WHEN 5 THEN TYPE_X ELSE NULL END),

  -- And the unique constraint!
  UNIQUE (OBJ_U, DATE_U, TYPE_U)
);
```
