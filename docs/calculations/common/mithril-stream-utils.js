// NOTE: Using script tag for now: <script src="https://unpkg.com/mithril@2.0.4/stream/stream.js"></script>
// unpkg's "?module" feature was still labeled "experimental" as of 2020-12-27.
const Stream = window.m.stream;

/**
 * Gets an element, querying the document if it's a selector
 * or just returning the element itself.
 * @param {string | Element} selOrElem
 */
export function getElement(selOrElem) {
  if (typeof selOrElem === 'string') {
    return document.querySelector(selOrElem);
  }

  return selOrElem;
}

/**
 * Gets all elements for a given selector string or normalizes
 * over an Element or Element Array to always return an Element Array.
 * @param {string | Element[] | Element} multiSelOrElemList
 */
export function getAllElements(multiSelOrElemList) {
  if (typeof multiSelOrElemList === 'string') {
    return [...document.querySelectorAll(multiSelOrElemList)];
  }

  if (! Array.isArray(multiSelOrElemList)) {
    return [multiSelOrElemList];
  }

  return multiSelOrElemList;
}

/**
 * Creates an Event Stream for a given element or selector and event name.
 *
 * FRP wise this is a Stream.
 *
 * @param {string | Element} selOrElem
 * @param {string} eventName
 * @param {boolean | AddEventListenerOptions} [options]
 */
export function streamFromElementEvent(selOrElem, eventName, options) {
  const elem = getElement(selOrElem);
  const stream = Stream();

  elem.addEventListener(eventName, stream, options);
  stream.end.map(() => {
    elem.removeEventListener(eventName, stream, options);
  });

  return stream;
}

/**
 * Creates an Element Stream for a given element or selector
 * that initializes with the element and updates every time that
 * element fires the named event.
 *
 * FRP wise this is a Behavior.
 *
 * @param {string | Element} selOrElem
 * @param {string} eventName
 * @param {boolean | AddEventListenerOptions} [options]
 */
export function elementStreamFromElementEvent(selOrElem, eventName, options) {
  const elem = getElement(selOrElem);
  const eventStream = streamFromElementEvent(elem, eventName, options);
  const elemStream = eventStream.map(event => event.target);

  elemStream(elem);

  return elemStream;
}

/**
 * Creates a stream of Element Arrays that is initialized with
 * the array of Elements provided or selected by the provided selector,
 * and which updates any time one of the elements fires the
 * given event.
 * @param {string | Element[] | Element} multiSelOrElemList
 * @param {string} eventName
 * @param {boolean | AddEventListenerOptions} [options]
 */
export function elementArrayStreamFromAllElementsEvent(multiSelOrElemList, eventName, options) {
  const elemList = getAllElements(multiSelOrElemList);
  const elemStreamList = elemList.map(
    elem => elementStreamFromElementEvent(elem, eventName, options)
  );
  return Stream.merge(elemStreamList);
}
