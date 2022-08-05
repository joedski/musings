Journal 2022-02-09 - Changing or Deleting a File Across All of History
======================================================================

One common suggestion is along the lines of:

```sh
git filter-branch --index-filter "git rm -rf --cached --ignore-unmatch path_to_file" HEAD
```

Looking at the help for `filter-branch`, we see this friendly warning at the top:

> git filter-branch has a plethora of pitfalls that can produce non-obvious manglings of the intended history rewrite (and can leave you with little time to investigate such problems since it has such abysmal performance). These safety and performance issues cannot be backward compatibly fixed and as such, its use is not recommended. Please use an alternative history filtering tool such as git filter-repo[1]. If you still need to use git filter-branch, please carefully read the section called "SAFETY" (and the section called "PERFORMANCE") to learn about the land mines of filter-branch, and then vigilantly avoid as many of the hazards listed there as reasonably possible.

That's a not included with Git though.

This would probably be easier if there were a way to tell it what commits to touch.

Perhaps there's an easier way?
