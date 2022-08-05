Journal 2022-08-03 - Searching for Children of a Commit to Find Incautiously Lost Work
======================================================================================

[This answer seems viable](https://stackoverflow.com/a/14247783):

```sh
COMMIT=...
git rev-list --all --not "$COMMIT^@" --children | grep "^$COMMIT"
```

Ultimately what I ended up needing for my specific case was something along the lines of:

```sh
git rev-list \
    --reflog \
    --graph \
    --pretty=oneline \
    --since 2022-07-21 \
    --author 'Joe Sikorski <[^<>]+>' \
    --not feature/my-branch-here
```

- `--reflog` searches everything, not just those things currently referenced by branches.
- `--since` narrows the scope to just those recent commits created since that date, which is known because rebasing thankfully doesn't change the commit date.
- `--pretty=oneline` gives me a bit more context.
- `--author 'regex'` lets me see only commits I contributed to.  Pretty obvious.
- `--not feature/my-branch-here` filters out the commits reachable by the current version of that branch, whereas I want the commits that were originally used to build that rebased current version.
