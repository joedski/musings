---
tags:
    - git
    - windows
    - nodejs
    - nodejs:npm
    - setup-woes
---

Journal 2020-07-08 - npm, Windows, and git-bash
========

Coworker recently got this error while trying to setup local dev for a webpack project.

```
npm ERR! path git
npm ERR! code ENOENT
npm ERR! errno ENOENT
npm ERR! syscall spawn git
npm ERR! enoent Error while executing:
npm ERR! enoent undefined ls-remote -h -t https://github.internal.company.com/HisWasStudiedLaboratory/quarter-life.git
npm ERR! enoent
npm ERR! enoent
npm ERR! enoent spawn git ENOENT
npm ERR! enoent This is related to npm not being able to find a file.
npm ERR! enoent
npm ERR! A complete log of this run can be found in:
npm ERR!     C:\Users\CowOrkerJim\AppData\Roaming\npm-cache\_logs\2020-07-08T18_55_09_658Z-debug.log
```

I didn't know anything off-hand, but searching for that error turned up [this SO question](https://stackoverflow.com/questions/56473680/npm-install-shows-error-with-git-not-found) with two answers that seemed relevant:

1. The command should be `git ls-remote -h -t ...` rather than `undefined ls-remote -h -t ...`, meaning either `git` is not installed, or it's at least not accessible by npm.
2. When setting up Git Bash, you must select at least the second option during the "Adjusting your PATH environment" step: "Git from the command line and also from 3rd-party software".
