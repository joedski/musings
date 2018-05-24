Handy Bits and Bobs for the *Nix CLI with a Bias Towards Bash and Compatible Shells
===================================================================================



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
