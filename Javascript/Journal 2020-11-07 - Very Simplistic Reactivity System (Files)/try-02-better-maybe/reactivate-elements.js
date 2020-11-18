import {
  updateOnElementEvent,
  withContextUpdate,
  eachElementEvent,
} from './reactivate-core.js';

export function withElement(sel, fn) {
  return fn(document.querySelector(sel));
}

export function fromTextInputValue(sel, parseValue = (value => value)) {
  const elem = document.querySelector(sel);

  updateOnElementEvent(elem, 'keyup');

  return () => parseValue(elem.value);
}

export function fromRadioset(multiSel, defaultValue = null) {
  const elemList = [...document.querySelectorAll(multiSel)];

  elemList.forEach(elem => {
    updateOnElementEvent(elem, 'change');
  });

  return () => {
    const selectedElem = elemList.find(elem => elem.checked);

    if (selectedElem) {
      return selectedElem.value;
    }

    return defaultValue;
  };
}

export function fromLastEvent(sel, eventName) {
  let lastEvent = null;

  const elem = document.querySelector(sel);

  withContextUpdate(update => eachElementEvent(event => {
    lastEvent = event;
    update();
  }));

  return () => lastEvent;
}
