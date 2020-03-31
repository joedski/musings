Journal 2020-03-31 - First Poke at Oracle DB With Sqlplus
========

> As a brief note, this was modified from a work-specific journal, so I don't have any example output.

So, I needed to pull a bunch of user IDs from some tables in an Oracle DB.  I've not touched Oracle before, having stuck with OSS solutions such as Postgres, MySQL, or for some cases SQLite.  So, this is new.

First, I just wondered if there was a way to get all the schemas?  [This answer](https://stackoverflow.com/a/4833518) suggests the following should do the trick:

```sql
-- Get all schemas that I have access to.
-- dba_users would be used if you're the DBA, but I'm not.
SELECT username
FROM all_users
ORDER BY username;
```

It does take a bit, but I get a decent number of records.  Alas, I don't see the schema I'm looking for.

I don't know if they're just not in the QA database or what, but the schema I was looking for was present in the Prod database, so I guess that's fine.

Next, I wanted all the tables.  Once again Google + Stack Overflow to the rescue: [a very nice answer with good explanations about listing tables](https://stackoverflow.com/a/205746), including an interesting historical note that may be useful if dealing with old scripts.  Nice!

The actual queries are summarized here:

```sql
-- Requires special privileges.
SELECT owner, table_name
  FROM dba_tables;

-- Shows only the ones I have access to, which is what I want.
SELECT owner, table_name
  FROM all_tables;

-- Shows only tables you own.
SELECT table_name
  FROM user_tables;
```

One helpful comment points out you can also filter out the system owned tables:

```sql
SELECT owner, table_name
from dba_tables
where owner not in (
    select username
    from dba_users
    where oracle_maintained = 'Y'
);
```

Though I don't know if I can actaully run that.  It might work with `all_tables` and `all_users`, though?  Haven't tried it.

That in mind, I try searching for just schemas with tables:

```sql
select distinct owner
from all_tables;
```

This again showed me nothing I wanted in the QA DB, but did show the schema I wanted in Prod.  Progress!

```sql
SELECT owner, table_name
FROM all_tables
WHERE owner = 'MY_PROJ'
AND table_name LIKE '%_USERS';
```

Which gave me a list of relevant tables.  Now I can finally use `describe`!

```
SQL> describe MY_PROJ.FOO_USERS
 Name                      Null?    Type
 ----------------------------------------- -------- ----------------------------
 ... other stuff
 CID                            VARCHAR2(12 CHAR)
```

Nice.

Now I can do things like

```sql
SELECT CID FROM MY_PROJ.FOO_USERS;
```

Which gives me a nice paged output that may be helpful on small terminals, but not so helpful if I just want to copy/paste things.  Apparently [you can turn it off with `set heading off`](https://stackoverflow.com/questions/58542211/oracle-sqlplus-how-do-i-output-header-only-once-when-spooling-more-than-50-000)?  And remove the page gaps with `set pagesize (number)`, like `set pagesize 50000`.  That should be big enough for me, at least.

Or, alternatively, just turn off paging with `set pagesize 0`, but that removes headers too I guess.

Also, something I wasn't querying just yet but was about to, you can write results to disk by setting `spool filename.ext`, and turn it back off with `spool off`.  Neat!  (Also you can shorten it to `spo`.  Heh.)

So in all, I can dump the user ids to disk doing something like this:

```
SQL> set heading off
SQL> set pagesize 0
SQL> spool foo_users.txt
SQL> SELECT CID FROM MY_PROJ.FOO_USERS;

... cids!

nn rows selected.

SQL> spool off
SQL>
```

I noticed the file was still empty after first running the select and wondered why.  I thought maybe it's buffering output until it needs to start shunting output elsewhere.  So, run `spool off` and sure enough, the file is now populated.  Excellent.

Also, it seems the `spool` thingy writes all of stdout to the file.  Interesting!  I'm guessing that's why [this other answer first `set termout off` and `set feedback off`](https://stackoverflow.com/a/58546616) before doing anything else, especially `spool`ing.
