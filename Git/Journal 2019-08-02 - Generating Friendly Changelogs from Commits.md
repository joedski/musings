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
    - I mean, I know why this is done currently: Because our build pipeline by default is set to just take whatever the current package-version number is as the build artifact version-derived name, which means if you commit to the mainline and don't bump the version, you overwrite the previous artifact, and the artifact names become meaningless.
        - Perhaps something not too different would be better:
            - All PRs merge to mainline as before, but no version bumping is done there.
            - Mainlines only have a single build artifact which is just "whatever was most recently pushed to it".
            - Then, when a new version is tagged, a new artifact is built, irrespective of the package-version.
            - ... so basically, Git-Flow, but not, but closer than we're currently doing.
- This will be much easier if everyone is consistent with pushing tags, but tags are always a separate thing to push.  Probably for good reason, but it means it's easy to forget.
    - Though, I've gotten in the habit of just doing `git push && git push --tags` so, I guess there's that.  Maybe I can convince others to do that, too.  Maybe just alias `git pushta` to that.
    - This also doesn't help with the whole "bump version in feature branch before merging" thing.
    - Looks like you _can_ have [per-repo aliases](https://medium.com/the-lazy-developer/five-life-changing-git-aliases-e4211c090017), but that doesn't put them up in the remote, only local.

Given our Git Flow-ish behavior and our love of tiny commits, it seems that the following setup would be ideal:

- List any Changelog-relevant things in the body of the Merge Commit.

I think that's about it, actually.  So, let's see if any prefabbed solutions fit that and can be used easily in a Node project.

> Unfortunately, Ruby sometimes has ... issues on OS X?  And I'm not entirely sure why, given it ships with the darn thing.  `rvm` messups?  Inexperience with Homebrew?  Screwing everything up because of how Homebrew works?  Hm.
>
> Might just have been trying to install dependencies for one specific package that gave me guff because as far as I can tell, Ruby itself seems to be working fine.



## Perhaps Another Way With My Current SemiFlow Workflow?

Currently, in our semi-Git-Flow methodology, which I'll just call Semiflow for now, we only deal with one mainline: `dev`.  We're not using `master` right now, though honestly we should...

How about this, then:

- Whatever `dev` is at when we do a release review, and it passes, we merge that to `master`.
- To generate a release changelog, we look at the git log of `master` for merges from `dev`.
    - Specifically, to generate the changelist for the last release, we look for the most recent `dev -> master` merge and the one before that.
- Using that, then, the Changelog Entry for the Last Release is thus:
    - The Version of the Changelog Entry is whatever the project version of the most recent commit to `master`.
    - The Changes of the Changelog Entry are all Changes listed in all Merge Commits between the most recent commit in `master` to the last merge commit from `dev` to `master`.

Hm, that doesn't quite work for hot fixes: That either means we have to change the existing changelog entry, which I don't like because Cool URLs Don't Change (and a hotfix must bump the version according to SemVer), or hotfixes will be folded into the next release rather than having their own thing.  Or possibly they'll be lost, if following the above methodology strictly.

Okay, so maybe we just use every merge commit to `master`?  That'd be easier.


### Methodology r1

Okay, so how's about this then: Trying to make it a bit loosely defined so that there's not too much to worry about.  The only specific format should be changelog entries.

Over all, then, there are two main parts to this methodology proposal:

- Changelog Entry Creation:
    - When is a Changelog Entry generated?
    - How is the range of Commits selected?
- Changelog Entry Definition:
    - Where does the Version of the Changelog Entry come from?
    - What is a valid Change item? (i.e. what text will be accepted as a Change for inclusion in the Changelog)
    - Where do Change items come from?

#### Git Workflow

- Features and normal fixes merge into `dev`.
- Releases and hotfixes merge into `master`.
    - Releases are usually done informally, by just merging `dev` into `master`.
- Commit messages may in their body include specially formatted lists of changes.  This should be done in the merge commits, but can be done in any commit as an allowance for dev forgetfulness.

#### Changelog Entry Creation

- A Changelog Entry will be generated any time `master` is merged to and the Project Version changes between the most recent merge commit and the previous merge commit to `master`.
    - The Version of the Changelog Entry is whatever the stated Project Version is in the merge commit which triggered the Changelog Entry generation.
    - The Changes of the Changelog Entry are every properly formatted Change in any commit message from all commits after the earlier merge commit and up to (and including) the merge commit which triggered the Changelog Entry.

#### Change Item Format

... Yeah.

My first thought is just something very simple:

- A List Item Demarcation
- A Change Category in All Caps
- A Change Category-Description Separator
- A Change Description that will be formatted as is.
    - Commonmark inline formatting is accepted.

Example:

```
- FIX : DE12345 Framistam was not preframbulated
- FEATURE: US54321 Implement true logarithmic horns
+ HOT FIX : DE23456 Super Hot
2. NOT SO FAST: FE9999 All the things!
```

And so on.  Other acceptable List Item Demarcations would be `+`, `*`, `1.`, and possibly others.  Any that would be acceptable Commonmark list items.

Other Notes:

- An optional Defect or User Story ID can be added for Rally Linkage, which would be easier if Rally actually used those IDs in the URL.

Tentative Regex: `/^(?:\s*[-+*]|[0-9]+\.\s+)(\b[A-Z ]+\b)(?:\s*:\s*)(.*)$/`

- Non-Capturing Group: `\s*(?:[-+*]|[0-9]+\.)\s+` List Item Demarcation and obligate whitespace.
- Capturing Group 1: `\b[A-Z ]+\b` Change Category.
- Non-Capturing Group: `\s*:\s*` Change Category-Description Separator with optional whitespace.
- Capturing Group 2: `.*` Change Description.

The Change Description will further be matched against the following: `/^((?:US|DE|FE)[0-9]+)?\s*(.*)$/`

- Optional Capturing Group 1: `(?:US|DE|FE)[0-9]+` Optional Rally Item ID.
- Capturing Group 2: `.*` Change Description.

Or we could just treat anything that looks like a Rally Item ID as linkable anywhere, if we could change that to a valid Rally URL, anyway.

> Actually, you can do that in a sort of roundabout way.  See [Supplemental: Linking To Rally Items](#supplemental-linking-to-rally-items).

#### Methodology r1 Rationale

The point of defining with as little strictness as possible (any properly formatted list item in the _body_ of the commit message of _any_ commit is considered a valid Change item) is to make the system as Git Workflow agnostic as possible.  Further, the only Git-Flow-specific thing is that Changelog Generation occurs on merges to `master`.



## <a id="supplemental-linking-to-rally-items">Supplemental: Linking To Rally Items</a>

It turns out you can [use the search link in a given project to pull up the target item](https://community.broadcom.com/communities/community-home/digestviewer/viewthread?MID=771681#bm5413d401-a250-4b1c-b0c9-964064e5fd67).

So for example, the link `https://rally1.rallydev.com/#/1234567890d/search?keywords=TA1234567` will redirect the user to `https://rally1.rallydev.com/#/1234567890d/detail/task/123456789012345`.  Nice!  Obviously, you have to hardcode the Rally Project ID, but that shouldn't change per-project, so it'll be fine.
