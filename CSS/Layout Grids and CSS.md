Layout Grids and CSS
====================

Putting aside that using separate classes rather than child/descendent selectors is much more efficient, it should be possible to create a generic flex layout component that covers common cases and allows for using the less common ones more easily.



## Considerations

First and foremost, doing this requires a clear separation of parent and child layout concerns.  Parent components should decide the spacing/padding between their children, while children themselves should only be concerned with the stuff within them.  Children deciding layout between themselves will inevitably lead to surprises, excepting cases where the Children themselves are specific to layout.

> For example, a case where conflation of semantics and layout concerns can lead to surprises might be where a generic `form-group` acts as both a logical grouping of form elements (or form input elements, in which case it should really be a `form-input-group`...) and as a layout spacing handler between the various `form-gruop`s.
>
> As an example of where semantics and layout concerns do _not_ lead to surprises, `grid` and `column` elements are used expressly to handle layout concerns, and their semantics align with this purpose.



## Setup

The way to do this is to define a single class as the base class for broader layout concerns, and then add modifiers or extensions to that base class.  Here, I'll be using a semi-BEM style, but this could almost as easily be done with 2 classes.

Here, I'll use the name `.layout`:

```css
.layout {
  display: flex;
  /*
  NOTE: The default for flex-direction is row, so keep that in mind.
   */
}
```

We can then define some common things to apply:

```css
/**
 * Explicitly specify row if we need to.
 */
.layout--row {
  flex-direction: row;
}

.layout--row.layout--reverse {
  flex-direction: row-reverse;
}

.layout--column {
  flex-direction: column;
}

.layout--column.layout--reverse {
  flex-direction: column-reverse;
}
```

Since the Flexbox model treats all children as Block-level elements, and ignores floats, we can start with that very good assumption.


### Spacing, Grids, Etc

```css
:root {
  /**
   * In this case, we have just one spacing value,
   * but your system may have multiple values for different contexts,
   * in which case they should be specified using additional modifiers.
   */
  --layout-spacing: 1rem;
}

.layout--spaced {
  padding: calc(var(--layout-spacing, 1rem) / 2);
}

.layout--spaced > * {
  margin: calc(var(--layout-spacing, 1rem) / 2);
}

.layout--spaced-flush.
/* NOTE: The child selector is necessary to ensure specificity */
.layout--spaced > .layout--spaced-flush {
  margin: calc(var(--layout-spacing, 1rem) / -2);
}
```

Unfortunately, it's not possible to tell automatically if the child should be "merged" or not spacing wise, so one or the other case must be explicitly called out.  In the above code, I decided to call out the "merge" case explicitly.

In cases where we don't want to merge spacing, we might have a child that is explicitly delineated for some reason, say it's a row of controls or something specifically inset with some visual distinction.  Just be careful in such cases of course that you don't over-space things.

> NOTE: Typically, I find negative margins to be a case where something is going terribly wrong, as they run afoul of one of my major personal rules: Children should not affect the layout around themselves, only within themselves, and margins, both positive and negative, affect the layout around the thing with those margins.  Worse still, negative margins do not act exactly the same in every circumstance.

#### On First-Child and Last-Child

Another possibility takes advantage of pseudoclasses `:first-child` and `:last-child`, however this is sensitive to LTR/RTL changes, which flexbox is ostensibly meant to abstract over.  It's for this reason that I tend to favor solutions which don't even assume direction, but as noted above they tend to require negative margins and sometimes act finnicky for that reason.



## Application of Layout Classes

We then can use the above classes to create any special one-off layout concerns.

```html
<div class="card">
  <div class="card__header">Stuff!</div>
  <div class="layout--spaced">
    <div class="card__body">
      <p>Stuff stuff stuff stuff stuff!</p>
    </div>
    <div class="card__controls layout--spaced layout--spaced-merged">
      <button class="button--primary">Yes!</button>
      <button class="button--secondary">No!</button>
    </div>
  </div>
</div>
```

This could be considered a bad example since cards are probably supposed to be fairly consistent in layout, and so some of this spacing should probably be specified as part of the card classes themselves.



## Compared to Full BEM

> TODO!
