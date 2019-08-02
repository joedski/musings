Journal 2019-08-02 - Generating Friendly Changelogs from Commits
========

Idealities:

- Should be able to add it to a project after the fact.
    - So, it should either only generate or support only generating a change log for the last release.
    - Or, it should be able to discard/ignore malformed input.
- Should be able to not have every commit used in the change log.
    - There's going to be a lot of internal commits that are individually meaningless to end users.  Such commits should not show up in the changelog.

Research:

1. [CookPete/auto-changelog](https://github.com/CookPete/auto-changelog)
2. [lob/generate-changelog](https://github.com/lob/generate-changelog)