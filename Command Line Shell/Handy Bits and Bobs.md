Handy Bits and Bobs for the *Nix CLI with a Bias Towards Bash and Compatible Shells
===================================================================================

A list of small snippets I've found variably useful over the years.  I've found it's helpful to both note them down just to have them and also to dissect them to learn more about the available tools.



## Errata

- 2019-05-16: Removed `function` key word on bash function definitions.  Apparently that's the most portable according to [Bash Pitfalls](http://mywiki.wooledge.org/BashPitfalls).



## Find files which contain all of a number of discrete strings

Here, this can be rearranged to be "Find files which contain one string, and find files out of those which contain another string, and..."

The process then is pretty simple:

```sh
find . -type f -print0 \
  | xargs -0 grep -lF --null -- STRING_1 \
  | xargs -0 grep -lF --null -- STRING_2 \
  | xargs -0 grep -lF -- STRING_N
```

Notes:
- Using `find` prevents issues when trying to glob many thousands of files.
- `xargs` allows passing them all on in a streaming manner.
- the `-type f` is used to stop `grep` from grepping dirs.
- `grep` is called with `-lF --null`.
  - `-l` tells `grep` to just list the files that match.
  - `-F` tells `grep` to treat the search as a fixed string rather than a pattern, which is much faster.  You can omit this if you need actual pattern support.
  - `--null` has `grep` print a 0-byte after the filename.
- Remember that `find` also accepts many other conditions such as `-name 'pattern'`.
- The last search does not pass `--null` to `grep`.
- The separate `--` to `grep` is unnecessary if `STRING_whatever` does not begin with two dashes.

This is also possible using just `find` by itself, but is less efficient due to not whittling down files with each successive layer of `grep`.

```sh
find . -type f \
  -exec grep -qF -- STRING_1 \
  -exec grep -qF -- STRING_2 \
  -exec grep -lF -- STRING_N
```

Notes:
- Notice that the last `grep` has `-lF` instead of `-qF`.
  - `-q` tells `grep` to output nothing, but exit with 0 if it found the search and non-0 otherwise.

See also:
- `ack`
- `ag`, the Silver Searcher.



## Random ASCII Passwords in a Pinch

```sh
openssl rand -base64 12
```



## Line-by-Line Loop in Bash

Pulled from [this answer](https://stackoverflow.com/a/10929511/4084010), and also attested to in [this BashFAQ page](http://mywiki.wooledge.org/BashFAQ/001):

```sh
#!/bin/bash
while IFS='' read -r line <&9 || [ -n "$line" ]; do
    if [ -n "$line" ]; then
        echo "Line >>>$line<<<"
    else
        echo "Blank Line"
    fi
done 9< "$file"
```

The explanations provided:

- `IFS=''` (or `IFS=`) prevents leading/trailing whitespace from being trimmed.
- `-r` prevents backslash escapes from being interpreted.
- `|| [[ -n $line ]]` prevents the last line from being ignored if it doesn't end with a `\n` (since `read` returns a non-zero exit code when it encounters EOF).
- `<&9` and `9< "$file"` uses a file descriptor that's not stdin for input.
    - This is really only necessary if you're doing other things in the loop that need access to stdin.  If you don't do anything like that, you can omit different FDs.
    - NOTE: you can also use `read -u 9 -r line` instead of `read -r line <&9` to make `read` use FD 9, but apparently that's not portable across all shells?

The BashFAQ link also has some snippets for loops that need to execute a body on a per-line basis, including a version which does _not_ open a subshell, thereby losing any context changes caused by the body.



## Local Variables in Functions: Visible to Other Called Functions

As noted in the Bash manual: "Local can only be used within a function; it makes the variable name have a visible scope restricted to that function and its children."

It seems then that it's used to set a "local" env that's local to just that function (and its children) rather than to the environment that the function is executed in.

```sh
outer() {
    local local_var=foo
    echo "outer: local_var = $local_var"
    inner
}

inner() {
    echo "inner: local_var = $local_var"
}
```

Calling `outer` then shows that `inner` can see that local var:

```
$ outer
outer: local_var = foo
inner: local_var = foo
```

Calling `inner` directly, of course, there is no local var:

```
$ inner
inner: local_var = 
```

Is this a feature?  Or a bug?  It could be considered both, but while possibly handy may lead to more fun bugs than not in the long term.  Alas, that's the specified behavior, for better or for worse.



## Dispatch Function: Git-Style Sub-Command Dispatch

A common pattern when grouping a bunch of commands in a similar domain under one top-level command.  This also gives a good starting loop for processing args.

- Arguments properly quoted.
- Supports both `basecommand help <cmd>` and `basecommand <cmd> --help` for showing command-specific help.
- Whitelists commands, with support for aliases.

Obviously, this is overkill for small commands, but anything with 2 or more sub-commands may benefit from this pattern, and parts of it can be taken as needed since it was written with robustness in mind.

```sh
basecommand() {
  # Tested in bash 3.2.57

  local dispatch_command=
  local dispatch_command_args=()
  local dispatch_show_help=

  while [[ ${#@} -ne 0 ]]; do
    case "$1" in
      ( help | -h | --help )
        # If we have a sub-command, treat this flag as a flag
        # to that sub-command.
        if [[ -n $dispatch_command ]]; then
          dispatch_command_args=( "${dispatch_command_args[@]}" "$1" )
          shift
        else
          dispatch_show_help=1
          shift
        fi
        ;;

      ( * )
        if [[ -z $dispatch_command ]]; then
          dispatch_command=$1
          shift

          # Support "basecommand help $CMD" syntax.
          if [[ $dispatch_show_help ]]; then
            dispatch_show_help=
            dispatch_command_args=( "${dispatch_command_args[@]}" "--help" )
          fi
        else
          dispatch_command_args=( "${dispatch_command_args[@]}" "$1" )
          shift
        fi
        ;;
    esac
  done


  # Handle the no-command case here.
  # Maybe there's a default one, or maybe you just show help.
  # In either case, this is where you specify that behavior.
  if [[ -z $dispatch_command ]]; then
    if [[ -n $dispatch_show_help ]]; then
      # Here's an example of a detailed help message.
      cat <<BASECOMMAND_DISPATCH_HELP

Does things.

Usage:

  basecommand <command> [...args]
    Do a thing.

  basecommand help
    Show this message.

  basecommand help <command>
  basecommand <command> --help
    Show help for a given command.

Available Commands:

  list
  ls
  l
    List things.

  init
    Does init stuff.

  exec <command> [...args]
    Does exec stuff.

BASECOMMAND_DISPATCH_HELP
    else
      echo "No command given; see 'basecommand help' for more."
    fi

    return 0
  fi

  # Command normalization.
  # Handle aliases, known commands, etc, here.
  # Argument validation should be delegated to the target command.
  case "$dispatch_command" in
    # alias/whitelist in one.
    ( l | ls | list )
      dispatch_command=list
      ;;

    # simple whitelist
    ( init | exec )
      ;;

    # anything else is UNACCEPTABLE.
    ( * )
      echo "Unrecognized command '${dispatch_command}'"
      return 1
      ;;
  esac

  # Lastly, do the thing.
  # Like git, the naming convention $BASENAME-$SUBNAME.
  "basecommand-${dispatch_command}" "${dispatch_command_args[@]}"
}
```



## Check If a Program or Function Exists in Bash (And Any POSIX Shell?)

[This answer](https://stackoverflow.com/a/677212/4084010) has a good summary of the main options which exit non-0 on non-existence and 0 on existence:

- `command -v <command-or-function> >/dev/null 2>&1` will work in any POSIX compatible shell.
- `hash <command-or-function> 2>/dev/null` will work in Bash, with the benefit of caching the path.

The dependable exit statuses means we can do things like `if hash foo 2>/dev/null; then ...`.



## On Temorarily Manipulating IFS

As noted in [Bash Pitfalls item #49](http://mywiki.wooledge.org/BashPitfalls), an Empty Var is different from an Unset Var, and `IFS` is no different here.

If doing something based on IFS that needs to affect the current environment, meaning you can't just use a subshell, then you'll need to do something to distinguish between Empty and Unset:

```sh
oIFS=${IFS+_${IFS}}
IFS=/; echo "${array[*]}"
${oIFS:+'false'} unset -v IFS || IFS=${oIFS#_}
```

If using a function, you can do this more easily by using `local`:

```sh
f() {
  # remember there are caveats to trying to set a value
  # in the `local` command line.
  local IFS
  IFS=/
  echo "${array[*]}"
}
f
```

If you don't need to be able to manipulate the current environment, you can just use a subshell:

```sh
( IFS=/; echo "${array[*]}" )
```


## Taking The First n Characters of a String Var

This can be done in [a few ways](https://stackoverflow.com/q/1405611) without invoking other programs.

1. Using substring extraction, which is in Bash but not Sh.
2. Using prefix and suffix removal, which is in both Bash and Sh.

Suppose we want to get the first two characters of some string:

```sh
foo="|foo|bar|baz"

# We want "|f" for whatever reason.

# Bash only.
echo "${foo:0:2}"

# Sh and Bash.
echo "${foo%${foo#??}}"
```

Another option is to use `printf`, which is a Bash built-in:

```sh
printf "%-2.s" "$foo"
```

Naturally, the [above SO question](https://stackoverflow.com/q/1405611) has numerous other ways that do involve invoking other programs, many of which are useful when you need to operate on multiple lines and/or when piping stuff about.


### Can We Take the Last n Characters?

Yes!

```sh
echo "${l_foo:$(( ${#l_foo} - 2 )):${#l_foo}}"
echo "${l_foo#${foo%??}}"
```



## Getting the Source Dir or Path of a Script

This would be nice to have, especially if you want script-relative imports rather than CWD-relative imports.  Bleh.

Unfortunately, as per all the discussions in the answers to [this SO question on the topic](https://stackoverflow.com/questions/4774054/reliable-way-for-a-bash-script-to-get-the-full-path-to-itself), there doesn't seem to be a wholly reliable way to do this when accounting for every single possibility.  Symlinks particularly seem to muck things up.

Still, the most reliable Mac+Linux ways seem to be:

```bash
# The output redirection is to handle unnecessary output for cases
# where `cd` has been aliased to `cd "$@"; ls` or something.
SCRIPTPATH="$( cd -- "$(dirname -- "$0")" >/dev/null 2>&1 ; pwd -P )"

# This gets around any aliases.
SCRIPTPATH="$( builtin cd -- "$(dirname -- "$0")"; pwd -P )"

# A maybe-less-unreliable one.  Works with sourced files.
# Bash specific, of course.
SCRIPTPATH="$(
    cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd
)/$(
    basename -- "${BASH_SOURCE[0]}"
)"
```

> Aside: [Some light reading about `$BASH_SOURCE` (or `${BASH_SOURCE[0]}`) vs `$0`](https://stackoverflow.com/a/35006505).

Here's [a script that supports even symlinks](https://stackoverflow.com/a/246128):

```bash
SOURCE="${BASH_SOURCE[0]}"
# NOTE: if you cd to a different directory before running this snippet, the result may be incorrect!
# resolve $SOURCE until the file is no longer a symlink
while [ -h "$SOURCE" ]; do
  DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
```

It seems like you should be able to wrap that up in a function and just use it a the beginning of your script.  Problem there is you'd have to first source the script because scripts aren't auto
