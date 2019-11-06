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

[jekyll-collections]: https://jekyllrb.com/docs/collections/

So, GH Pages has Jekyll to drive some dynamism in page generation.  Basically, I generate a metadata file (metadata, markdown, hmmmm) and Jekyll will pick that up and actually link to it.

I could still output the actual talks to `<pages-url>/talks` but may need to move the source around.  Hm.

I should probably install Jekyll locally and play around with it there because the documentation isn't really clear about what the results of those settings and files are, nor does it say anything about files other than the ones Jekyll itself generates.  Will it merge things?  Will it overwrite?  Dunno!  I'll have to iterate, and pushing to GH just to iterate is slow and I'm impatient.
