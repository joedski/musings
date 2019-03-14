Journal 2019-03-14 - My Own Markdown Plugins - Sources List
===========================================================

Wonder if I can make my own Markdown plugins?  I mean, I probably can, given the other markdown plugins.  Specifically, I'd like to make one that automatically handles my sources lists, and lets me reference said lists.

Things I imagine I'll need to cover:

- Automatic list formatting.
- Automatic link reference naming/renaming.
    - I don't actually need link references to have any sort of naming logic... they could even be entirely random.
- Automatic link reformatting and reference generation.
- Link titles?
- GFM parsing, AST manipulation.
- Uplifting of existing Sources lists.
- Listing of references in a document when doing a referencial link.
    - That is, when you type `[blah blah][` the autocomplete would show a list of references and what they reference.
        - This may require differentiating between External Links for Items, and Items themselves.
        - Or, I guess, Links themselves would just be converted to `[blah blah](#ss-1-1)` while External Links would remain `[blah blah][ss-1-1]`.  That keeps them differentiated.
- Automatic List Handling.
    - Or should that be handled by a different plugin?  Hm.
- Markdown flavors other than Commonmark?
    - Very low priority, but writing it down anyway.
- Maybe being able to reference multiple different lists in the same document?
    - Referencing non-link items would mean creating `<a id=""></a>` tags, but yeah.  Don't need to be `<a>`, but it's short and handy, so hey.
    - Going off the Declaration Comment, it could be something like:
        - `<!-- @MarkdownReferenceList "sources" -->` for a list named `sources`.
        - `<!-- @MarkdownReferenceList "pros-cons" list-type="unordered" -->` for a list named `pros-cons`, unordered.
        - Etc.

Sources:

1. Prior Art:
    1. [MarkdownTOC][ss-1-1]: creates a TOC from the headers in the document.  Neat.  Hopefully there's a standard way to autogen the anchor names from the text.
        1. I like the idea of using a comment "block" (pair of "open" and "close" comments) to declare a Thingy.  I might have to convert to using that.
        2. However, for my own use cases, that'll also mean the ability to convert existing Sources lists by just adding the comment.
    2. [MarkdownEditing][ss-1-2]: Powerful editing features and a custom color scheme.
        1. Would be nice except that when it installs, it fubbernucks any existing color/theme settings for Markdown even after removal.  I also think that their color themes are too low contrast.
            1. I very much like that their code blocks have a separate background, though.
        2. I also don't like its color scheme relative to my current preferred color schemes.
        3. But, it may be worth looking at the features.
    3. [MarkdownFootnotes][ss-1-3]: Automatically handle footnotes, keeping them numbered and such.

[ss-1-1]: https://github.com/naokazuterada/MarkdownTOC
[ss-1-2]: https://github.com/SublimeText-Markdown/MarkdownEditing
[ss-1-3]: https://github.com/classicist/MarkdownFootnotes

What might be a good way to break this out into smaller parts?

Hmm.  I'm starting to wonder if there's actually two separate things going on here?

- Most of the actual functionality seems to be based around Link References, and the fact that those links show up in Lists seems kind of incidental.
- On the other hand, this is something to support my specific workflow of tracking references in ordered lists, with the actual URLs moved out of the lists themselves to declutter the lists.
- The naming of the references based on the list item position is mostly to make finding them in the list easier for humans, so I'll probably keep that.
