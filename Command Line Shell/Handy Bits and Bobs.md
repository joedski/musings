Handy Bits and Bobs for the *Nix CLI with a Bias Towards Bash and Compatible Shells
===================================================================================

A list of small snippets I've found variably useful over the years.  I've found it's helpful to both note them down just to have them and also to dissect them to learn more about the available tools.



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
function outer() {
    local local_var=foo
    echo "outer: local_var = $local_var"
    inner
}

function inner() {
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
