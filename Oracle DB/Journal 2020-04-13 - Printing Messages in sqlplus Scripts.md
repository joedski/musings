---
tags:
    - dbms:oracledb
    - sqlplus
---

Journal 2020-04-13 - Printing Messages in sqlplus Scripts
========

1. [An answer about just echoing each query][so-echo-queries] using `set echo on`.  Not what I'm going for, but good to know.
2. [This forum peppered with obnoxious video ads][forum-use-prompt] has a post suggesting using `prompt your message here`. (note the lack of quotes)
    1. [Oracle doc on the PROMPT command][oracle-doc-prompt].  Apparently you can use `&varname` to add a script argument.  Interesting.  However their example script seems to be missing line endings.
3. While a comment on this question suggests `prompt` again, [the main answer][so-put-line]

[so-echo-queries]: https://stackoverflow.com/questions/19843858/how-to-echo-text-during-sql-script-execution-in-sqlplus
[forum-use-prompt]: https://www.unix.com/unix-for-advanced-and-expert-users/225223-print-message-while-using-sqlplus.html
[so-put-line]: https://dba.stackexchange.com/a/105797
[oracle-doc-prompt]: https://docs.oracle.com/cd/E11882_01/server.112/e16604/ch_twelve032.htm#SQPUG052
