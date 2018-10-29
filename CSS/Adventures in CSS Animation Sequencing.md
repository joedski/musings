Adventures in CSS Animation Sequencing
======================================

It seems like it would in this day and age be trivial to chain together CSS animations in a sequence of some sort.

Not So!



## Sources

1. [CSS Bezier curve toy](http://cubic-bezier.com)
  1. Cleverly, you can't enter an x value outside of the domain of 0 to 1, so you can't create loops.  Damn.  (Not that that would actually help.)
2. [Easing Function Cheat Sheet](https://easings.net/)
3. [Something about delays](https://stackoverflow.com/questions/33004919/chaining-multiple-css-animations)
4. [Codrops reference on `animation-timing-function`](https://tympanus.net/codrops/css_reference/animation-timing-function/)



## Research

Before I can do any actual trials, I need to find out how the various things work.


### On the Animation Timing Function

Empyrical testing shows that the animation timing function applies to the tween between each keyframe, and according to [(Ss 4)](https://tympanus.net/codrops/css_reference/animation-timing-function/), I can specify the timing function for a given tween by specifying the function in the starting keyframe.

For example, if we want to bounce, we can do this:

```css
@keyframes bounce-test {
  0% {
    transform: translateY(-20px);
    animation-timing-function: ease-in;
  }
  50% {
    transform: translateY(0px);
    animation-timing-function: ease-out;
  }
  100% {
    transform: translateY(-20px);
  }
}
```

This makes it easy to do various bouncing animations.  Oddly, this doesn't seem to get mentioned very much.  As of 2018-10-24, the MDN docs don't mention this as an option anywhere that I could find.
