const Stream = window.m.stream;

const inputValue = streamFromElementUpdatedOnEvent('#input-value', 'keyup')
  .map(elem => parseFloat(elem.value))
  ;

const inputMultiplyByChoice = streamFromAllElementsUpdatedOnEvent(
  '[name=input-multiply-by]',
  'change'
).map((radioset) => {
  const checkedRadioElem = radioset.find(elem => elem.checked);
  if (! checkedRadioElem) return 2;
  return parseFloat(checkedRadioElem.value);
});

const derivMultiplied = Stream.lift(
  (value, multiplyByChoice) => value * multiplyByChoice,
  inputValue, inputMultiplyByChoice
);

derivMultiplied.map(withElement('#deriv-doubled', elem => value => {
  elem.value = value;
}));

////////

function getElement(selOrElem) {
  if (typeof selOrElem === 'string') {
    return document.querySelector(selOrElem);
  }

  return selOrElem;
}

function getAllElements(multiSelOrElemList) {
  if (typeof multiSelOrElemList === 'string') {
    return [...document.querySelectorAll(multiSelOrElemList)];
  }

  if (! Array.isArray(multiSelOrElemList)) {
    return [multiSelOrElemList];
  }

  return multiSelOrElemList;
}

function streamFromElementEvent(selOrElem, eventName, options) {
  const elem = getElement(selOrElem);
  const stream = Stream();

  elem.addEventListener(eventName, stream, options);
  stream.end.map(() => {
    elem.removeEventListener(eventName, stream, options);
  });

  return stream;
}

function streamFromElementUpdatedOnEvent(selOrElem, eventName, options) {
  const elem = getElement(selOrElem);
  const eventStream = streamFromElementEvent(elem, eventName, options);
  const elemStream = eventStream.map(event => event.target);

  elemStream(elem);

  return elemStream;
}

function streamFromAllElementsUpdatedOnEvent(multiSelOrElemList, eventName, options) {
  const elemList = getAllElements(multiSelOrElemList);
  const elemStreamList = elemList.map(
    elem => streamFromElementUpdatedOnEvent(elem, eventName, options)
  );
  return Stream.merge(elemStreamList);
}

function withElement(sel, fn) {
  return fn(document.querySelector(sel));
}
