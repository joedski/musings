Journal 2020-03-02 - Better Gitconfig in Dotfiles
========

Not really much to say here.

- When even you make global config changes, git modifies `~/.gitconfig`
- I want to keep a bunch of shared settings, aliases, etc
- I don't want to commit tokens or corprate proxies to the shared settings, since they're not exactly shared across everything

Currently I have things setup such that my `.gitconfig` is what lives in `dotfiles`, but that's not really good if local settings are going to tromp on it.

Rather, then, it'd be better to have a `.gitconfig_common` and just modify any local `.gitconfig` to reference that then leave the local one alone.

And, of course, if I don't have one at all, I can just copy an existing one.

Essentially, we'd have this at the top of `.gitconfig`:

```gitconfig
[include]
  path = .gitconfig_common

# ... computer specific things!
```

Then all the aliases I want to share across things would go into `.gitconfig_common`.  This means `git` is free to edit `.gitconfig`, which is what it does anyway.



## Dotfile Setup Command

It'd be nice to be warned if `.gitconfig_common` isn't in the `include.path` value set.

The following can be used to test if it's in the list of included files.  Yep, you can have include files.

```sh
git config --get-all include.path | egrep '^\.gitconfig_common$'
```

From there, we can just wrap that in a bit of shell conditional stuff to recommend adding it:

```sh
if (git config --get-all include.path | egrep '^\.gitconfig_common$'); then
# ... nothing!
else
    echo "Add '.gitconfig_common' to your included gitconfigs: git config --add include.path .gitconfig_common"
fi
```
