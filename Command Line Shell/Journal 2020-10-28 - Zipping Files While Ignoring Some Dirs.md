Journal 2020-10-28 - Zipping Files While Ignoring Some Dirs
========

I want to zip files while ignoring `node_modules` dirs.  I know that `zip` has a bunch options, so maybe there's a way in there?  If not, maybe `find` will help.  (We can always use `zip`'s `-@` option after all...)

> ```
> -@ file lists.   If  a file list is specified as -@ [Not on MacOS] ...
> ```

Oh.  `--name-stdin`, then, I guess.

Anyway.  The man page doesn't fill me with confidence, so off to `find` it is.  Probably better that way.

```sh
find some_dir -not \( -name 'node_modules' -or -name 'bower_components' \) | less
```

Solid start, but that only omits items that are not themselves called one of those things.  We really want to eliminate anything within those dirs.

We can start by just picking out only files with `-type f`, then use pattern matching to remove the other things.

```sh
find some_dir -type f -not \( -path '*/node_modules/*' -or -path '*/bower_components/*' \) | less
```

Significantly slower, but better, and fine for a one-off operation.  This ignores symlinks too, which may be problematic for certain things I've done.

```sh
find some_dir \( -type f -or -type l \) -not \( -path '*/node_modules/*' -or -path '*/bower_components/*' \) | less
```

There, that's better.
