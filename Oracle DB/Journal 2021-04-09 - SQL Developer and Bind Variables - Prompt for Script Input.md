Journal 2021-04-09 - SQL Developer and Bind Variables - Prompt for Script Input
========

I need to look into this more, but it seems SQL Developer will prompt you for any `:foo` style variables you use.  They'll be treated as strings (by default?) so you don't need to quote them, like with `&Substatution`/`&&Substitution`s.

This only works for Queries and DMLs you execute, not for Blocks, though.  With Blocks, you just get an error stating that the variable is not defined.
