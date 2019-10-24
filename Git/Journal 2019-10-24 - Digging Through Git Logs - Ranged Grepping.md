Journal 2019-10-24 - Digging Through Git Logs - Ranged Grepping
========

Because we can't take like 10 minutes to actually talk about [keeping a changelog](https://keepachangelog.com/en) I'm going to dig through git logs.  Also I need to do that right now and talking to team members when they're across the world and currently asleep is slow, but at least we can talk at all. (though not when they're asleep.  Yet.)

Specifically in this case, I need to look at PR merge commits between a given tag and `HEAD` of a mainline.

[One answer](https://stackoverflow.com/a/7124949/4084010) uses `git log --all --grep="thing"` so it looks like I can just do `git log --grep "Merge pull request #"` to get those.  Then, `git help log` shows `git log [<options>] [<revision range>] [[--] <path>...]` as the full command line options for `git log`, so I should be able to do this:

```bash
git log --grep="Merge pull request #" $rev_ish..
```

So if I wanted to go from tag `v2.3.0` to now, I'd do

```bash
git log --grep="Merge pull request #" v2.3.0..
```

And that gives me a list of all PR merges.  Nice.
