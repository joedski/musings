import {
  reactivate,
} from './reactivate.core.js';

import {
  getElement,
  readValueFromTextInput,
  readValueFromRadioSet,
} from './reactivate.utils.js';

function compose(...fns) {
  return fns.reduce((pipedFns, fn) => (...args) => pipedFns(fn(...args)));
}

const app = reactivate(() => {
  const inputValue = compose(
    parseFloat,
    readValueFromTextInput('#input-value')
  );

  const inputMultiplyBy = compose(
    parseFloat,
    readValueFromRadioSet('input[name=input-multiply-by]')
  );

  const derivResult = () => inputValue() * inputMultiplyBy();

  return () => {
    getElement('#output-result').value = derivResult();
  };
});
