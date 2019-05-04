Journal 2019-05-03 - On GNU Sed vs BSD Sed, the latter which OS X has
======

One of the mitigating factors on using OS X as a day to day driver is that the Darwin core gives you access to a lot of old *NIX tools.  One of the downsides is that most of those tend to be BSD versions and somewhat out of date if there are newer shinier GNU versions.

One such case is `sed`.

To my knowledge, most GNU `sed` scripts can be adapted to work in the `sed` that ships with OS X, but you have to keep in mind the following things:

- Labels (`:foo`) must be on their own lines.
- A branch command (`t`, `b`, etc) must be the last thing on a line, with no whitespace or closing brackets after it.
    - This means function lists that end with branches/jumps must have the closing brace on the next line!

These things are ultimately a result of this:

- Any function expecting a label (`:`, `t`, `b`, etc) will consume all characters after it until it hits a newline, and treat those characters as its label.



## Case Study

We can see a symptom of this if we try to make a simple script to strip leading whitespace and comments:

```sh
sed -E ':x
/^ +| *--.*$/ {
    s///; bx
}'
```

In GNU `sed`, you can write it like this:

```sh
sed -E ':x; /^ +| *--.*$/ {s///; bx;}'
```

But on OS X's `sed`, it will mysteriously do nothing!

If you try to put the label on its own line, you instead get an error, though that's better than mysteriously failing.

```sh
sed -E ':x
/^ +| *--.*$/ {s///; bx;}'
```

```
sed: 2: ":x
/^ +| *--.*$/ {s///; ...": unexpected EOF (pending }'s)
```

It seems that it's ignoring the closing `}`...

The solution?  More line breaks.


### What Happened the First Time?

Curious, though, that the one-liner did nothing, not even error.  What happened?

The answer is actually in that error: The label is being set to everything following the function expecting a label!

We can observe this by actually tweaking the newline-filled version above:

```sh
sed -E ':x; /^ +| *--.*$/ {s///; bx;}
/^ +| *--.*$/ {
    s///; bx; /^ +| *--.*$/ {s///; bx;}
}'
```

And it works as expected, no errors.  This also explains why the one-liner did nothing: All we did was tell `sed` to define a label!
