On Creating Maintainable CSS Layout Styles
=======

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
