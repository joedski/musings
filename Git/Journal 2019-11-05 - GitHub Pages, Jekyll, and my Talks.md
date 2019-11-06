---
tags:
    - github
    - github-pages
    - jekyllrb
summary: >-
    Figuring out a good way to leverage GH's Jekyll stuff to ease index generation for my talks, so I don't need to manually update an HTML file every time.
---

Journal 2019-11-05 - GitHub Pages, Jekyll, and my Talks
========

1. [Jekyll Collections][jekyll-collections] seems like what I'd want?
2. [Static Files in Jekyll][jekyll-static-files]

[jekyll-collections]: https://jekyllrb.com/docs/collections/
[jekyll-static-files]: https://jekyllrb.com/docs/static-files/

So, GH Pages has Jekyll to drive some dynamism in page generation.  Basically, I generate a metadata file (metadata, markdown, hmmmm) and Jekyll will pick that up and actually link to it.

I could still output the actual talks to `<pages-url>/talks` but may need to move the source around.  Hm.

I should probably install Jekyll locally and play around with it there because the documentation isn't really clear about what the results of those settings and files are, nor does it say anything about files other than the ones Jekyll itself generates.  Will it merge things?  Will it overwrite?  Dunno!  I'll have to iterate, and pushing to GH just to iterate is slow and I'm impatient.



## Combining Generated Pages with Static Content

So what I want is basically, files in my talks to be published to `/talks` as well as an index file in `/talks/index.html` that lists the lot of them.

Looking at a new site and the results of `jekyll build`, it looks like files that do not begin with `_` are copied as is.  That's both good and bad, as it means potential for files to be ignored.  However, at least for my talks, that's not happened yet, so at least for now it should be fine!  Just need to be aware of that.

So, what happens if I have both `/_things/...` and `/things/...`?

- Project Root
    - `_things/` the metadata, I guess
        - `thing-1.md`
        - `thing-2.md`
    - `things/` the static assets
        - `thing-1/index.html`
        - `thing-2/index.html`
        - `index.html` Has front-matter so that Jekyll processes it.

Okay, `things/` is certainly in the output, but that's because I turned `collections.things.output` to `false`.  What I need is an index file.

The entire `collections` config:

```yaml
collections:
  things:
    thingish: true
    output: false
    sort_by: thing_index
```

The index file has a simple template in it:

```html
---
page: things!
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Things</title>
</head>
<body>
  {% for thing in site.things %}
  <div>
    <a href="./{{ thing.thing_sub_dir }}">{{ thing.content }}</a>
  </div>
  {% endfor %}
</body>
</html>
```

This seems to produce the desired output.  Cool.  Not the most intuitive, but it works, so I'll take it.  Too bad I can't just iterate dirs, but at the same time it's nice having a place to put metadata like titles and dates and such.


### Reverse Order

Not sure how to do it by reverse.  But, there seems to be a `reverse` function that can be used inline?  Maybe if I try `for thing in (site.things | reverse)`, that'll work?

Aah, nope:

```
Liquid Warning: Liquid syntax error (line 8): Expected dotdot but found pipe in "thing in (site.things | reverse)" in things/index.html
```

Das ist nicht so gut.

Seems you have to `assign` first:

```html
  {% assign things_reversed = site.things | reverse %}
  {% for thing in things_reversed %}
    <!-- ... -->
  {% endfor %}
```

Explains why that's what [all](https://gist.github.com/lukecathie/2b4eaad90467b3a7c266) [those](https://gist.github.com/Phlow/1f27dfafdf2bbcc5c48e) snippets do.

But that works!  Now the Things are in Descending Order instead of Ascending, with Thing 2 coming before Thing 1.  Excellent.
