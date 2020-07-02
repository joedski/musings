Journal 2020-05-04 - Managing Front-Matter Tags
========

I'd like to do a better job tagging journals, but I'm running into issues with that:

- I'm lazy.  Super lazy.  I really don't want to dig around my journals for tags.  Bleh!  I program!  Make the computer do that boring stuff!  It's more fun to figure out how to make the computer to do the thing than it is to do the thing.
- Tags really need descriptions to explain what they are, or what's intended by them, anyway.
- It'd be nice for those tags to be listed in a readable format, too.  Sure, tooling can create an SQLite DB or whatever it wants, but the serialized format should be plain text.  YAML?  CSV?  Markdown Table?  Who knows!  YAML is probably the best compromise between human readable and machine readable.
- It'd also be nice if the auto-suggest or whatever it's called now would show the tags along with those explanations.

So I guess it's mainly three things:

- Store the current list of tags in a human and machine readable format, which includes any new tags from the current document.
- Tags need descriptions, or at least can have descriptions.  They may or may not start out with them, though.
    - They probably won't, really, like, that seems like an extra complicated UX flow.
- Tags need to show up at the appropriate time in the editor's suggestions box: when editing the `tags` top-level key in the markdown front matter.

Once that's done, it'd be nice to have an "implied tags" type thing, which would mostly be used for "parent tag" type setups, but could also indicate other things.  Dunno!  But that's actually really easy to add.



## Storing the List of Tags

I want this to be something that can be started on any bin of markdown files, and freely restarted every time.

That means pretty much scanning everything.


### Scanning Files for Tags

No real way to get around doing this, but some provision could be made for changes I suppose, if I wanted to optimize.

First, though, just how to approach it?

First thoughts:

- List of files to scan
    - This will look like a gitignore file, I think.  And in fact, you could import the gitignore file as a list of files to, well, ignore.
    - Maybe something like `#!skip_files_from .gitignore` and `#!include_files_from some-other-file.ls`?
- Format
    - I'unno.  Probably a YAML or JSON file with everything nice and normalized and ordered alphabetically so that the order of things is stable.
    - Efficiency could be sped up by caching settings in an SQLite DB, but that's a tech concern.  I'll probably just use all in-memory stuff to start because that's easier.
