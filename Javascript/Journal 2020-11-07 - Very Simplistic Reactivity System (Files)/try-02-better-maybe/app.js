import {
  reactivate,
  fromTextInputValue,
  fromRadioset,
} from './reactivate.js';

function withElement(sel, fn) {
  return fn(document.querySelector(sel));
}

function putToElementProp(sel, propName, value) {
  withElement(sel, elem => {
    elem[propName] = value;
  });
}

function putToElementValue(sel, value) {
  putToElementProp(sel, 'value', value);
}

const appContext = reactivate(() => {
  const inputValue = fromTextInputValue('#input-value', parseFloat);
  const inputMultiplyByChoice = fromRadioset('[name=input-multiply-by]', '2');

  const valueMultiplyBy = () => {
    if (! inputMultiplyByChoice()) return 2;
    return parseFloat(inputMultiplyByChoice());
  };

  const derivDoubled = () => inputValue() * valueMultiplyBy();

  return () => {
    putToElementValue('#deriv-doubled', derivDoubled());
  };
});
