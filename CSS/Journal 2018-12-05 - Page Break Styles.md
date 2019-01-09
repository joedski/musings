Page Break Styles
=================

1. [CSS Tricks page on Page Break CSS Props][ss-1]
    1. Good basic overview, but seems to be too optimistic?
2. [Stack Overflow question from 2011][ss-2]
    1. [Comment on one of the answers about how they had to go about applying the stated fix][ss-2-1]
        1. Basically: Both the element with `page-break-inside: avoid` and its parent had to have `position: relative`.
            1. I've seen something like this elsewhere, where someone basically ended up having to apply `position: relative` to _everything_ to get `page-break-inside: avoid` working.
    2. Other things mentioned as problematic in answers to that question:
        1. Anything that takes elements out of normal document flow, such as `position: absolute`, `position: fixed`, `float: *`.
            1. I wonder if this or somethintg like this is what applying `position: relative` to everything fixed?
        2. Anything that takes elements out of block flow: `display: inline-block`.  (Inline elements cannot avoid page-breaks.)
        3. Anything that causes scrollbars or clips content: `overflow: hidden`
        4. Any non-0 min-height setting: `min-height: 42px`
        5. Old IEs (IE < 8) can't handle page breaks on elements if prior elements don't have explicit heights... And just how are you supposed to do that?
3. [CanIUse page on page-break feature support][ss-3]
    1. Of note, everyone but Opera Mobile says "partial or mitigated support"...
4. [Stack Overflow answer on `page-break` with `float`s (and `position: absolute`!)][ss-4]
    1. Okay, not quite what I'm looking for.  This uses `page-break-after` on a `clear: both` element that, in this case, is being programmatically inserted after each set of columns.
        1. I suppose it could work, but I'd rather avoid too many page breaks.  I want page breaks to occur only if a card would be broken in two pieces, not just immediately after every card or columnset.
    2. It does note however that `position: absolute` will cause any `page-break-*` styles to not function, which makes sense, even if it's possibly annoying.

[ss-1]: https://css-tricks.com/almanac/properties/p/page-break/
[ss-2]: https://stackoverflow.com/questions/7706504/page-break-inside-doesnt-work-in-chrome
[ss-2-1]: https://stackoverflow.com/questions/7706504/page-break-inside-doesnt-work-in-chrome#comment86526687_12386608
[ss-3]: https://caniuse.com/#feat=css-page-break
[ss-4]: https://stackoverflow.com/a/47205329



## Printing a SPA

So, coming back to this in 2019, I'm now officially working on this as my current work task on a project I, naturally, am not at liberty to directly discuss.  Never the less, I feel this work will be valuable to document, if for no other reason than there's a chance it may coincide with someone else's project setup and thus may prove useful to them.


### Unfloating Bootstrap Columns

One thing I wanted to try was unfloating the columns since, as noted in [some answers to that old 2011 question][ss-2], floats can cause issues.  We're still using Bootstrap 3, with its floated columns, so I needed to override all of them...

```less
.col-unfloat-sizes (@sizes; @max-span; @size-index: length(@sizes)) when (@size-index > 0) {
  @size: extract(@sizes, @size-index);
  .col-unfloat-size-spans(@size; @max-span);

  .col-unfloat-sizes(@sizes; @max-span; @size-index - 1);
}

.col-unfloat-size-spans (@size; @span) when (@span > 0) {
  .col-@{size}-@{span} when not (@size = false) {
    float: none;
    width: 100%;
    page-break-inside: avoid;
  }

  .col-@{span} when (@size = false) {
    float: none;
    width: 100%;
    page-break-inside: avoid;
  }

  .col-unfloat-size-spans(@size, @span - 1);
}

@media print {
  .col-unfloat-sizes(lg md sm xs false; 12);
}
```

We're also using an old version of Less, 2.7.2, so I can't quite compact that down.  Eh.

That does unfloat things, but doesn't succeed in eliciting desired print behavior.  Unfortunately, many other possible issues exist, so I'm going to have to keep trying, I guess.


### Try Everything Else?

Guess I'll just go down the list until, hope against hope, something works.  I'll guard things behind feature-flags so that I can try to boil things down to minimal combinations later.  Details of implementation, if it's particularly tricky, will be featured in subsections after the list.

Note that items are being layered on in the order they are written in this list, meaning first the first item was added, then the second, then the third, each _without_ removing the prior.  Trying all then paring down later.

- [x] Unfloat Bootstrap Columns
    - **Nope.**
- [x] Change the Position of Bootstrap Columns and Rows to `position: relative`
    - **Nope.**
- [x] Change the position of our custom Card component to `position: relative`
    - **Nope.**
- [x] Override `position: inline-block` from `.slide-item`
    - What adds that?  That class also adds a `transition` style, so perhaps something dealing with that.
        - Looks like it's indeed added for our `transition-group`.  Well, no need to worry about transitions here, unless we're printing on epaper...
        - And of course, those are scoped styles, so now we have to `!important` the override.
    - **It worked!**
        - However!  Now there's an extra empty page.
- [ ] Override the Min Height of the Bootstrap Columns
    - To prevent merging of floated 0-height columns, Bootstrap gives them a `min-height: 1px`.
    - Skipped!
- [ ] Override `min-height: 100%` from the `#app > main` element.
    - Skipped!


### Extra Empty Page

Now there's an extra empty page, which I'd rather not have there since that'll waste paper, which is all of unecological, a slight business waste, and just plain annoying.  I did not ask for this blank page, it does not even say "This page intentionally left blank!"  Imbecilic Box!  Why do you disobey!

Unlike above, each of these items are being tried in isolation.

- [x] Try `display: none` on the footer?
    - **Nope**, blank page is still there.
- [x] Try `display: none` on a slideout hidden at the bottom?
    - Notably, the element it contains has `display: none` already (while it's put away, anyway) but this container does not.
    - **Nope!**
- [x] Try removing the `height` and `min-height` of `#app > main`?
    - **Ah hah!**  This seems to work.  I'll put those in at the components themselves, I think.


### Unnecessary Elements

- [ ] App Header?
    - Actually, need to ask about this one first.
- [x] Main Nav
- [x] Page Options Pane
    - I could see an argument for seeing the current values in this, but I'm going to omit it for now.
- ... I think that's about it.


### Other Oddities

These aren't layout blockers per se, but rather things that make the print out messier than desired.

- [x] We have an error message overlay on one item whose background is removed by the browser's own base print styles, causing text overlap.
    - This probably won't get printed out in practice, but still.  I think this may require invoking the double-`!important`.  Specificity wars hoooooooooooooo.
- [x] Keeping current layout
    - Currently all our custom cards just go to 100% width, but in wider screens they're using `.col-md-X` to spread out.
    - Aaand nope, looks like when printing, Chrome at least sets the screen to a width smaller than the `md` breakpoint.  Ah well.


### Paring Down Rules

Now that I've gotten everything nice and pretty, I want to reduce the number of rules to the bare minimum actually needed.

- [x] Try removing the unfloat code.
    - Huh, actually, it still works fine.  In fact, it seems to work fine even if I have `page-break-inside` applied only to our custom cards, rather than to the `col-*` classes.
- [x] Try removing the rows/cols relative positioning.
    - Cool, removing this still leaves print layout intact, too.
- [x] Try removing the relative positioning on the custom cards.
    - Print styles still intact.


### Testing in IE

I don't have a Windows computer and I'm pretty sure I'm not allowed to just load up BrowserStack and plunk our app in that, so I'm going to have to wait until our main tester has a chance to verify that the current styles work in our IE support matrix.


### Fixing other things

- [ ] Wonder if I should keep the part that forced columns to be `width: 100%`?


### Dispersing the Print Styles

Having all the print styles in one place is nice, but would it be better to have them distributed to the places they specifically override?

Pro-Distribution:
- Reduce reliance on `!important`.
- Print styles at points of override, so each component has style code in one place.

Contra-Distribution:
- Print styles everywhere, not in one location.
- Bootstrap overrides already have to sit at the top level somewhere.
