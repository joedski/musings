Journal 2020-03-23 - On Why To Use Only Released And Settled Features In Big Projects
========

Although one can nail down all the dependencies for a project, including things like what compiler/transpiler to use for experimental language features, I've found I tend to gravitate towards using only "official" versions and features as time goes on.

To be sure, I think it's worth experimenting with features, especially if it's to prove out whether or not something works in practice, but especially for apps where either I'm going to be touching it rarely or where I'm going to work on it a bit then it's going to be shuffled off to another team beacuse reasons, I've come to more of the opinion that experimental or as-of-yet unreleased things should be dispreferred.

Mostly it comes down to: things which haven't reached official release status can change, sometimes drastically, such that there are incrontravertable differences between the official release and the one used in the project.

I think the most salient example so far regarding language features is JavaScript Decorators.  At least, it is for me, anyway.

Back in the day, Babel and TypeScript supported experimental Stage 1 Decorators, which were just functions that operated on things, usually methods or classes.  You couldn't use them on just function declarations, or anything else besides class declarations for that matter, something I considered a huge deficiency, but they were still there.

As things moved towards Stage 3 however, the way Decorators were being implemented was far different than just a new way of playing with functions: it became an entirely new language construct.  This was done to favor static analysis, something which I don't disagree with, but which did invalidate all of the old existing Stage 1 stuff.

Now, if one can nail down all of the dependencies including compiler/transpiler tooling, why does it matter what you use?

For actively maintained projects, it doesn't.  For projects that are no longer actively maintained, however, it means more project-specific context that is different from established general context that must be learned.  True, all projects carry specific context, but less specific context means less to learn before productivity can be achieved.

> Aside: The more you can boil setup to simple standard install procedures or setup scripts, the better.  Project setup itself should be something that's tested regularly, just like any other part of a codebase.  Boy howdy is it annoying though.  Testing setup, I mean.
>
> One nice thing about setup scripts: For those that can use them directly, they make setup a relative breeze.
>
> Another nice thing about setup scripts: Even if you can't use them directly, they encode what you need to do and, hopefully, any assumptions made.  Provided you understand what it's trying to do, anyway.
