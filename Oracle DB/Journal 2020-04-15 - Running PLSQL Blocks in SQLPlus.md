Journal 2020-04-15 - Running PLSQL Blocks in SQLPlus
=======

SQLPlus is a program that can interface with an Oracle DB, but does not itself include an SQL language parser.  Not knowing this at first led to a few misunderstandings on my part, but does explain among other things how/why `set` commands don't need a semicolon.

One of those things that also vexed me is [how to run PL/SQL blocks](https://docs.oracle.com/cd/E11882_01/server.112/e16604/ch_four.htm#i1039663).

- If you put a `.` its own line, that terminates the current subprogram.
- If you put a `/` on its own line, that both terminates _and executes_ the current subprogram.

This explains why so many examples have all those `/`s between things: they're SQLPlus sub-program termination-executions!

You can also use `RUN` if you want to be lest mystical.
