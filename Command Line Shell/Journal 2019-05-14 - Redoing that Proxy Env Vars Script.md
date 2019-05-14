Journal 2019-05-14 - Redoing that Proxy Env Vars Script
=======================================================

Awhile back I wrote a slightly terrible proxy-env-vars-thingerdo script.  It sorta worked, but had some quirks that arose from not understanding things like the implications of sourcing the definitions file, local variable scope, etc.

I've learned a few more things about Bash and such, and have grown as a developer, I think it's time to revisit it.



## The Features

Importantly, I want to support these things:

- Should be able to load a set of env vars from a list of sets.
- Should be able to list those sets, possibly with descriptions.
- Should be able to run a command with those env vars set for the subshell.
- Should be able to set those env vars into the current env.
- Because I still need it, should have a convenience function to set the env vars for `npm`, `yarn`, and `git`.  Also be able to toggle `strict-ssl` because the corporate proxy doesn't always handle the SSL certificates correctly, so I need to enable MITM-Allowed mode.

Most of these are doable without requiring sourcing a file, but the "Set env vars into current env" does require either doing that or outputing a script to execute.  Or outputing env vars in a form that can be array-fed.  Hm.


### Run a Command With Env Vars Set For the Subshell

This is basically sourcing a `.env` file in a subshell before executing a command in that same subshell.  As such this should be pretty generic, and probably doesn't need to be strictly associated with the proxification script.

Some considerations:

- `export "${arr_var[@]}"` can export all `KEY=VALUE` pairs in an array.
    - Command length is limited, though.
- `env "${arr_var[@]}" othercmd` can execute `othercmd` with env vars added by `KEY=VALUE` pairs in an array.
    - Using `env` with the `-i` option will run the `othercmd` with _only_ the specified env vars.
    - Command length is limited, though.
- `while IFS='' read -r l <&3 || [[ -n $l ]]; do arr_var=( "${arr_var[@]}" "$l" ); done < "$path_to_file"` will load all lines into an array.  Can add additional line-by-line checking and processing in the loop body.
    - NOTE: Cannot handle actual `\n` in the values, you need to use `$'\n'` or something for those.
- Parens in a Bash script will execute the contents in a subshell.
    - `( export FOO=foo )` will not affect the environment of the parent shell.

We might use something like this to run a given command with a given env:

```sh
function runwithenv() {
    local envfile=$1

    # Create a subshell so we can export freely.
    (
        while IFS='' read -r l <&42 || [[ -n $l ]]; do
            if [[ -n $l && $l != "#"* && $l == *=* ]]; then
                # We just export rather than building an array
                # to avoid potentially long lines.
                export "$l"
            fi
        done 42< "$envfile"
        # Run the command.
        "$@"
    )
}
```

That's probably the most common case.


### Overwrite Env Vars in Current Env

Here's the only tricky one I can see.  There's basically two choices:

- Run command that outputs stuff that can be handed to `env` or `export`, slurped into an array, etc.
- Run function that calls `export` in the current shell, and does _not_ enter a subshell.

The latter is a trivial modification of the above:

```sh
function sourceenv() {
    local envfile=$1

    while IFS='' read -r l <&42 || [[ -n $l ]]; do
        # Skip empties
        # Skip comment-lines
        # Skip lines that aren't assignment-like
        # ... it's not the most thorough.
        if [[ -n $l && $l != "#"* && $l == *=* ]]; then
            export "$l"
        fi
    done 42< "$envfile"
}
```

In fact, that actually lets us shorten up the above function:

```sh
function runwithenv() {
    (
        sourceenv "$1"
        shift
        "$@"
    )
}
```

So there's some synergy.  Obviously those need to have guards against not specifying a file, file not found, etc, but yeah.

With these two things, the rest of the functions should be pretty trivial, and sanitary to boot.
