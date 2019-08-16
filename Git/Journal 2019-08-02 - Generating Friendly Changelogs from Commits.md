---
tags:
    - source-control
    - project-management:changelogs
---

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
3. [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog) seems to be slickly presented, but requires enforcing good commit message behavior.
    - Changelogs built from the commit summary lines.  That might be a non-starter for us.
4. [Using `git log --pretty=format:'...'`](https://coderwall.com/p/5cv5lg/generate-your-changelogs-with-git-log)
    1. [Also a handy reference for how to omit merge commits when doing this](http://unruhdesigns.com/blog/2011/07/generating-a-project-changelog-using-git-log)
        - It just uses `grep -v` but still, good starting point to know about.
5. [Simple, 0-dependency ruby script to take specifically-formatted commit details and organize them into lists](https://brettterpstra.com/2017/08/14/automatic-release-notes-from-git-commit-messages/)

It will certainly help to consider the exact case I'm dealing with, as many cases may be different.

- We're using Git Flow (ish) as our methodology: We have feature and fix branches, but we're not really doing release branches.
    - This was a deliberate choice to choose gate keeping over continuous merging.  I'm not sure if this is a good idea long term, but that's the trade off we're making right now.
        - Maybe an approach where we only gate keep people during some probationaly period then move on to trunk based?
        - But then we have to actually get everyone to use feature flags, and the team politics of that are controversial.  I'm ambivalent, 1 person is strongly for, another is strongly against, and the rest claim not enough experience to have a strong opinion.  We're shipping though, so at least there's that.
- We're a very small team but still have a wide spread of dev skill level.
- We like to make a lot of small commits.
- Our commit message discipline isn't the best... (hmmm)
- I personally dislike squashing commits because I've run into issues in the past were git bisect was extremely helpful, and that's not a tool I want to blunt.
- Want to be able to build a Changelog that's user-relevant, not just a summary of "things we did in the codebase".
    - User's don't care that we refactored things unless it actually leads to meaningful value to them.  "Refactored something to use AsyncData" is meaningless.  That sort of thing should be shoved under the umbrella of "Refactors to increase maintainability", which is something meaningful, albeit not entirely directly.

Complications:

- The current vogue seems to be to bump the version on a feature branch before merging it.  I hate this, and I don't understand why it's the way to do it, but no one else seems to want to do anything else.
    - Every time a branch has a version bump and gets merged, other branches are blocked for a time:
        1. They must merge the latest mainline (okay, you should do that every time anyway)
        2. They must wait for any CI pipeline stuff to run, which can take 5-10 minutes.
        3. They will then proceed to repeat this blockage for everyone else, which leads to a lot of sitting around doing nothing.
- This will be much easier if everyone is consistent with pushing tags, but tags are always a separate thing to push.  Probably for good reason, but it means it's easy to forget.
    - Though, I've gotten in the habit of just doing `git push && git push --tags` so, I guess there's that.  Maybe I can convince others to do that, too.  Maybe just alias `git pushta` to that.
    - This also doesn't help with the whole "bump version in feature branch before merging" thing.
    - Looks like you _can_ have [per-repo aliases](https://medium.com/the-lazy-developer/five-life-changing-git-aliases-e4211c090017), but that doesn't put them up in the remote, only local.

Given our Git Flow-ish behavior and our love of tiny commits, it seems that the following setup would be ideal:

- List any Changelog-relevant things in the body of the Merge Commit.

I think that's about it, actually.  So, let's see if any prefabbed solutions fit that and can be used easily in a Node project.

> Unfortunately, Ruby sometimes has ... issues on OS X?  And I'm not entirely sure why, given it ships with the darn thing.  `rvm` messups?  Inexperience with Homebrew?  Screwing everything up because of how Homebrew works?  Hm.  Might have just been trying to install dependencies for one specific package that gave me guff.
