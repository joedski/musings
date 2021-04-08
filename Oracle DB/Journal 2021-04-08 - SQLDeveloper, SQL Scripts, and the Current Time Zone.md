---
tags:
    - date-time-code
---

Journal 2021-04-08 - SQLDeveloper, SQL Scripts, and the Current Time Zone
========

Or, another episode in _Date Time Code Makes Me Livid Then Depressed and Resigned Again_.

> Summary: When writing an SQL script to execute in SQL Developer (or probably anywhere else you connect to an Oracle DB to run a script), then instead of `CURRENT_TIMESTAMP`, you need to use `cast(CURRENT_TIMESTAMP - interval '1' hour As timestamp)`.
>
> And maybe take off the `- interval '1' hour` when not in DST, or don't.  I don't actually know.
>
> If you're just running a whole script then exiting, you can just do `ALTER SESSION SET TIME_ZONE = '+00:00';`

It seems [you have to hard code the startup timezone option](https://stackoverflow.com/questions/14864015/how-to-change-the-timezone-of-oracle-sql-developer-oracle-data-modeler) if you want it to operate in the One True Computer Timezone of GMT.  Of course, this doesn't help at all if you have to send a script to someone else because...

The _timezone of the session_ SQL Developer opens with the remote Oracle DB is whatever SQL Developer is set to!  Which means you have to get everyone else to update _their_ SQL Developer settings, too!  And then remember to do it if you migrate to a new computer!

Or, you can [bloat your script up to fix that](https://stackoverflow.com/questions/22305466/oracle-date-compare-broken-because-of-dst) regardless of what computer it's on.  Of course, now you must remember to do that in every script going forward, and thank goodness this doesn't affect servers which _have their local time zone set to GMT like they `dam` well `FAQ`ing should_.  But it's better than expecting everyone to always remember to perform magical config setup that shouldn't need to be done in the first place.

Just to keep this handy...

Instead of `CURRENT_TIMESTAMP`, you need to use `cast(CURRENT_TIMESTAMP - interval '1' hour As timestamp)`.

At least, during DST.  Not DST right now?  Guess you have to remove that adjustment because `FAQ` you that's why.

`FAQ`.

I suppose you could set the session timezone to with `ALTER SESSION SET TIME_ZONE = '+00:00';`, but then you have to remember to do that every single time you connect.  Maybe I should do both, just for the extra assurance, but that means it ultimately still degrates to the lowest common denominator of that long `cast()` call just to prevent issues whe copy/pasting random segments of the script, because you can't control what other people are going to do with your script.
