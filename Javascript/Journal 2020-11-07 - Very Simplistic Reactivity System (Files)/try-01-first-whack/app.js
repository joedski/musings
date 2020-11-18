import {
  reactivate,
  readTextInput,
} from './reactivate.js';

function setup() {
  const inputValue = () => readTextInput('#input-value', parseFloat);
  const derivDoubled = () => inputValue() * 2;

  return () => {
    writeToTextInput('#deriv-doubled', derivDoubled().toString());
  };
}

function writeToTextInput(selector, value) {
  const elem = document.querySelector(selector);
  elem.value = String(value);
}

const deactivate = reactivate(setup);
