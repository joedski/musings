On Creating Maintainable CSS Layout Styles
=======

> TL;DR-TL;DR:
> 
> A button-set that contains buttons (or other things) and controls the spacing between/around those buttons is good.
> 
> A bunch of buttons that come with implicit margins is bad.

> TL;DR: For maintainable and predictable layouts:
> 
> - Elements should in general have complete control over spacing within themselves.
>     - In general they _should_ have control over the spacing _outside_ any of their children.
>     - In general they should _not_ have control over the spacing _within_ any of their children.
> - Elements should in general _not_ have any control over spacing outside of themselves.
> - Systems of elements used to implement a specific layout can and should coordinate their spacings to best achieve the specific layout, but when used together should still appear to follow the above rules relative to other elements outside of that system.

Some terminology, because I like big words:

- Parent/Parents: Any element which contains any Child/Children.
- Child/Children: Any element(s) which is/are contained by a Parent.
- Obligate Child/Children: Any Child/Children element(s) which are necessarily contained by (a) certain Parent/Parents for the purposes of creating specific layouts.
    - Examples:
        - Bootstrap: A Container is a Parent element with Columns as Obligate Child elements, since according to the layout methodologies documented, proper layout is acheived by having a Parent element which is a Container that has, as direct Children, Column elements.
        - Vuetify: A V-Layout element is a Parent element with V-Flex elements as Obligate Child elements, since according to the layout methodologies documented, proper layout is acheived by having a Parent element which is a V-Layout element that has, as direct Children, V-Flex elements.
- Non-Obligate Children: Any Child/Children element(s) which are not (an) Obligate Child/Children.
- Outer Spacing: Any space from the outside edge of any given element to the outside any other element, or inside edge of any Parent.
    - A Border may be used to visually delineate an outside edge of a given element.  So may a differently-colored Background.
        - The Spacing being discussed in this document then is outside of such a Border or Background.
    - Some elements may not have a visible Border or Background in the resting state, but may have a such a visible Border or Background in a hovered or activated or other state.
        - The Spacing being discussed in this document then is outside of such a Border or Background, regardless of whether or not that Border or Background is visible in the resting state.

Generally speaking, then:

- Parents should have the most control over Outer Spacing of any Children within themselves.
- Non-Obligate Children should not control the Outer Spacing around them.
    - Thus, when an inner Parent is a Non-Obligate Child of some outer Parent, the inner Parent should only control the spacing _within_ itself, and should not control its Outer Spacing.  That Outer Spacing should be controlled by the Outer Parent.
    - In turn, the Outer Parent should not control its own Outer Spacing.  So on and so forth.
- Non-Obligate Children should not expect any specific Outer Spacing around them.
- Obligate Children may, in coordination with their Parent, control their Outer Spacing to implement a given layout.

Will there be exceptions?  Probably.  I think the above are good rules to try to follow, though.

Implementation Thoughts:

- Outer Spacing is frequently implmented using CSS Margins, though this is not always the case.  Exact properties and methods used depend on the layout being implemented.
- In cases where layout is controlled only by CSS Classes, Obligate Child Classes can be applied to Non-Obligate Children to save some DOM tree elements, but it can be complicated to determine when it's appropriate to do this and when it's not.
    - This depends on systematically applying the above rules and thus not having Non-Obligate Children depend on being able to control their Outer Spacing, nor expect any specific Outer Spacing.
    - Further, if certain children have certain default Outer Spacings applied to them as a matter of UI Theming, this could break them.  Or it could be an intentional override.  It's a complication, regardless.
- Like many systematic things, this usually trades conciseness for orderliness.  Layouts will be explicitly stated, which means both that they are more verbose and also that they are clearly stated for the next person who comes in.



## On Prose Content

I'm defining "Prose Content" here to mean "Any content which is primarily text and associated inline or in-flow content", which means technically the Prose Content could be poetry.  Redefining things is fun.

Relevant to the over all topic, however, is this: for the purposes of Layout, Prose Content is itself a specific kind of Parent which will have certain layout concerns when it comes to children.

I can think of two general cases of Prose Content:

- Monolithic Prose Content, which is any block of Prose Content that is _not_ broken into Sections.
- Sectioned Prose Content, which is any block of Prose Content that _is_ broken into Sections.

While fun, I'm not sure it's necessary to actually distinguish between these things other than semantic organization.  The following are (ideally) equivalent in effect:

```html
<article class="prose">
    <section class="prose__section">
        <p><!-- ... --></p>
    </section>
    <section class="prose__section">
        <p><!-- ... --></p>
    </section>
</article>
```

```html
<article>
    <section class="prose">
        <p><!-- ... --></p>
    </section>
    <section class="prose">
        <p><!-- ... --></p>
    </section>
</article>
```


### The Reasoning For Prose Content

Sometimes, you need a long block of text where headers and other child-blocks have specific spacings around them, but don't want to bother with the tedious, error-prone management of header classes.

Like with other layout blocks, then, a Prose Content Parent can define the layout of Children.  What's possibly different from other Parents is that the Prose Content Parent may have quite a number of definitions that target Element Selectors rather than Class Selectors.

```scss
// Instead of this kind of thing:
.foo {
    // Remember that with SCSS, this results in an entirely separate
    // top-level class selector, not a nested selector.
    &__thing {
        // ...
    }
}

// you'll have more of this:
.prose {
    > h1 {
        // ...
    }

    > p {
        // ...
    }

    > * + p {
        // ...
    }

    // etc
}
```

As for the above example, I think that using the direct-child combinator is the most prudent option:

- Because it's targeting elements, not classes, the scope should be as limited as possible.
- If for some reason you need to have something else deep down have `.prose > ...` styles applied, just add `.prose` again to the relevant container.  This keeps explicit the application of such styling.

I believe that this thus provides the best combination of convenience and control without absolutely ruining everything that's an arbitrarily deep descendent.
