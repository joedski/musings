import {
  useRedrawingEffect,
} from './reactivate.core.js';

export function getElement(sel) {
  return document.querySelector(sel);
}

export function getAllElements(sel) {
  return document.querySelectorAll(sel);
}

export function readValueFromTextInput(sel) {
  const element = getElement(sel);

  useRedrawingEffect(({ redraw }) => {
    element.addEventListener('keyup', redraw);

    return () => {
      element.removeEventListener('keyup', redraw);
    };
  });

  return () => element.value;
}

export function readValueFromRadioSet(sel) {
  const elementList = [...getAllElements(sel)];

  useRedrawingEffect(({ redraw }) => {
    elementList.forEach(element => {
      element.addEventListener('change', redraw);
    });

    return () => {
      elementList.forEach(element => {
        element.removeEventListener('change', redraw);
      });
    };
  });

  return () => {
    const checkedElement = elementList.find(element => element.checked);

    if (checkedElement == null) {
      return null;
    }

    return checkedElement.value;
  };
}
