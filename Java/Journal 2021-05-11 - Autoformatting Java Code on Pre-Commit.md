Journal 2021-05-11 - Autoformatting Java Code on Pre-Commit
========

Yanno what's annoying?  Worrying about code formatting.  That's annoying.

Formatting on pre-commit is my preferred way to handle this.  Only setup you need to do is project setup, and the rest is handled for you.

Main issue?  Setting it up on Windows is really annoying.

Basically there's no way to really escape some amount of major headache in the process and I hate it.

Anyway.  Research.

Some quick digging by asking Google about "run eclipse formatter on pre commit hook":

1. Someone's gist from about 11 years ago, last touched about 5 years ago: https://gist.github.com/ktoso/708972
2. Not relevant to most of my setups since I don't use IntelliJ (maybe I should try it?), but here's a rendition for that program: https://stackoverflow.com/a/45713741
3. This one uses Google Java Formatter: https://medium.com/@harshitbangar/automatic-code-formatting-with-git-66c3c5c26798
4. There's also [astyle](http://astyle.sourceforge.net/), which covers Java but also C, C++, and C#.  Oh and Objective C, but Swift is the new hotness so disregard that I guess.  So that's pretty neat.
    1. Nvidia has [some guidance on setting it up for pre-commit](https://docs.nvidia.com/gameworks/content/technologies/mobile/native_android_sweng.htm).

Looks like the ideal case would be to run it on the CI server, so that we don't even have to do any local setup.  That would be awesome, actually.  Finally, we can ~~delete~~ de-emphasize all the "you must load up this style XML file or pay attention to these indentations and whatnot" stuff.  I mean, you _should_ still load up things locally, but if we really want to enforce this we need to automate it to free us from having to think about that in the first place.

It's no AST editing, but it's something.
