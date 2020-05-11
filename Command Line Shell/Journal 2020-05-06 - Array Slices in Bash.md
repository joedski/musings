Journal 2020-05-06 - Array Slices in Bash
========

Because apparently just writing it in Python is too easy.

In Bash, you can take just a slice of an array with `${arr_name[@]:a:b}` notation, where `a` is the first element (0-indexed) and `b` is the last element (0-indexed, inclusive).

So, given this:

```bash
foo_arr=( a b c d )
echo "${foo_arr[@]:1:2}"
```

will echo "b c".  (Rather than, say, "b", which is what you'd expect in JS.)

Can you use variables for those indices?

```bash
foo_arr=( a b c d )
foo_start=1
foo_end=2
echo "${foo_arr[@]:$foo_start:$foo_end}"
```

Apparently you can, because this also echos "b c".  Changinging `foo_start` and `foo_end` and rerunning the echo line also produces expected results.

And how about variables that also get processed?

```bash
foo_arr=( a b c d )
foo_idx=1:2
echo "${foo_arr[@]:${foo_idx%:*}:${foo_idx#*:}}"
```

Indeed, this produces "b c" as well.  That means we can store a list of slices of an array, which at least gives us pseudo 2D arrays.

We could also store index lists using white-space separated lists, giving us the ability to make sets of source arrays, so there's that.  I went with a non-white-space delimiter for the range because it made the trim operations hopefully less inscrutible.
