Journal 2021-11-30 - Querying Info on the Table Columns Themselves in Oracle
============================================================================

In Oracle, you can use the `ALL_TAB_COLUMNS` table to look at other tables that you can see, which can be useful for certain operations such as verifying that certain common columns are correctly setup in certain Hibernate setups.

Why might certain Hibernate setups not be consistent?  What an interesting question that I shall not answer here!

```sql
-- Summary
select distinct data_type, char_length
from all_tab_columns
where owner = 'MY_APP_SCHEMA'
and column_name = 'SOME_COLUMN'
;

-- Details
select table_name, data_type, char_length
from all_tab_columns
where owner = 'MY_APP_SCHEMA'
and column_name = 'SOME_COLUMN'
;
```
