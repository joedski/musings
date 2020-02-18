Journal 2020-02-17 - Prepending a Line To All The Files (The Inefficient Way)
========

I want to prepend a particular line (or two) to a bunch of files, and I want to do it only to those files that don't already have it.

Here's what I came up with at the time:

- Use `ack` to find files of a particular type that do not include the line.
- Use `sed` through `xargs` to edit every file to rewrite them in place, but first print out these extra lines into them.

```sh
_text='// @ts-check'
_text_script="1 i\\
$_text\\

"
ack -L --type=js "$_text" --print0 | xargs -0 -n 1 sed -i '' "$_text_script"
```
