Journal 2020-06-12 - General BYOND Resource Links
========

1. The Language
    1. [BYOND Quick Ref](http://www.byond.com/docs/ref/#/DM/)
    2. [BYOND For Designers](http://www.byond.com/docs/guide/)
    3. [Useful Pages for Developers](http://www.byond.com/developer/articles/resources)
        1. Ter13's posts particularly are good.
2. Definitions and Stuff
    1. [`stddef.dm`](http://www.byond.com/forum/post/1820598) (NOTE: may be horridly out of date, it was posted 2015.)
3. Tooling
    1. [SpacemanDMM](https://github.com/SpaceManiac/SpacemanDMM), a suite of tools for working with DreamMaker codebases.
        1. [DreamMaker Language Server](https://github.com/SpaceManiac/SpacemanDMM/blob/master/src/langserver/README.md)
        2. Also [a parser that produces an AST](https://github.com/SpaceManiac/SpacemanDMM/tree/master/src/dreammaker).  Hmmmmmmmmmmmmmmmm.
            1. Note that you can also use `dm.exe`/`DreamMaker` with a few flags for certain things, too:
                1. `dm.exe -code_tree my_proj.dme` dumps a tokenized view of the DM project.
                2. `dm.exe -o my_proj.dme` dumps an XML version of the code tree.
