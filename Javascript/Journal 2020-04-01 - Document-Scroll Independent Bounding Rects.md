Journal 2020-04-01 - Document-Scroll Independent Bounding Rects
========

The simplest way to get the scroll-independent bounds is to just offset the DOMRect returned by `getBoundingClientRect()` by `window.scrollX` and `window.scrollY`.  No non-Edge IE supports those two window props, though, so you're better off using `window.pageXOffset` and `window.pageYOffset`... for some IEs.

[MDN provides this as a fully compatible snippet](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollX):

```js
var x = (window.pageXOffset !== undefined)
  ? window.pageXOffset
  : (document.documentElement || document.body.parentNode || document.body).scrollLeft;

var y = (window.pageYOffset !== undefined)
  ? window.pageYOffset
  : (document.documentElement || document.body.parentNode || document.body).scrollTop;
```

You can also use [this harder to read snippet](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect):

```js
const scrollX = (((t = document.documentElement) || (t = document.body.parentNode))
  && typeof t.scrollLeft == 'number' ? t : document.body).scrollLeft

const scrollY = (((t = document.documentElement) || (t = document.body.parentNode))
  && typeof t.scrollTop == 'number' ? t : document.body).scrollTop;
```

However I think I would politely but vehemently disagree with writing it that way.

`getBoundingClientRect()` itself however has been supported since IE4, so we're pretty safe there.

Anyway, we can fix our bounds rects thusly:

```js
/**
 * Get the scrolling body element for IE compat.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollX
 * @return {Element} The scrolling body element.
 */
function getBodyElement() {
  return (
    document.documentElement ||
    document.body.parentNode ||
    document.body
  );
}

/**
 * Get the scroll-x of the window/body.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollX
 * @return {number} How far right the window/body is scrolled.
 */
function getViewportScrollX() {
  if (window.pageXOffset !== undefined) {
    return window.pageXOffset;
  }

  return getBodyElement().scrollLeft;
}

/**
 * Get the scroll-y of the window/body.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollY
 * @return {number} How far to down the window/body is scrolled.
 */
function getViewportScrollY() {
  if (window.pageYOffset !== undefined) {
    return window.pageYOffset;
  }

  return getBodyElement().scrollTop;
}

/**
 * Gets the rendered bounding rectangle of an Element
 * with respect to the document's top-left rather than
 * with respect to the viewport.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollX
 * @param  {Element} el Any Element, which must support `getClientBoundingRect()`.
 * @return {DOMRect} A DOMRect-shaped object.  (It's not really a DOMRect.)
 */
function getBoundingWindowRect(el) {
  if (el == null) {
    throw new Error('Cannot get bounding rectangle of null or undefined element');
  }

  if (typeof el !== 'object') {
    throw new Error('Cannot get bounding rectangle of non-object');
  }

  if (typeof el.getBoundingClientRect !== 'function') {
    throw new Error('Cannot get bounding rectangle of object which does not support getBoundingClientRect()');
  }

  const viewportRect = el.getBoundingClientRect();
  const windowScrollX = getViewportScrollX();
  const windowScrollY = getViewportScrollY();

  return {
    top: viewportRect.top + windowScrollY,
    left: viewportRect.left + windowScrollX,
    bottom: viewportRect.bottom + windowScrollY,
    right: viewportRect.right + windowScrollX,
    x: viewportRect.top + windowScrollY,
    y: viewportRect.bottom + windowScrollY,
    height: viewportRect.bottom - viewportRect.top,
    width: viewportRect.right - viewportRect.left,
  };
}
```



## Consideration: Off-Screen Items

Along with the Scroll X and Scroll Y, we can use [`window.innerWidth`](https://developer.mozilla.org/en-US/docs/Web/API/window/innerWidth) and [`window.innerHeight`](https://developer.mozilla.org/en-US/docs/Web/API/window/innerHeight) to complete the viewport rectangle.

```js
function getViewportRectangle() {
  const windowScrollX = getViewportScrollX();
  const windowScrollY = getViewportScrollY();
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  return {
    top: windowScrollY,
    left: windowScrollX,
    bottom: windowHeight + windowScrollY,
    right: windowWidth + windowScrollX,
    x: windowScrollX,
    y: windowScrollY,
    height: windowHeight,
    width: windowWidth,
  };
}
```
