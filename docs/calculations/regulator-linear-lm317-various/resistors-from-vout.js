// resistors-from-vout.js

function addEventListenerToId(elementId, eventName, handler, ...otherOptions) {
  const el = document.getElementById(elementId);
  el.addEventListener(eventName, handler, ...otherOptions);
  return () => el.removeEventListener(eventName, handler, ...otherOptions);
}

function getFloatFromTextInput(inputId) {
  const inputEl = document.getElementById(inputId);
  const rawValue = inputEl.value;
  const value = parseFloat(rawValue);
  return value;
}

function updateTextInputFromText(inputId, value) {
  const inputEl = document.getElementById(inputId);
  inputEl.value = value;
}

function update() {
  // Vout :: V
  const inputVOut = () => getFloatFromTextInput('calc-r2__input-vout');
  // Iadj :: A
  const inputIAdj = () => getFloatFromTextInput('calc-r2__input-iadj');
  // R1 :: Ω
  const inputR1 = () => getFloatFromTextInput('calc-r2__input-r1');

  // Vref :: V
  const constVRef = () => getFloatFromTextInput('calc-r2__const-vref');

  // Iref :: A = Vref / R1 = 1.25V / R1
  const derivIRef = () => constVRef() / inputR1();
  // R2 :: Ω = (Vout - Vref) / (Iref + Iadj)
  const derivR2 = () => (inputVOut() - constVRef()) / (derivIRef() + inputIAdj());

  // Verification: Vout = Vref (1 + R2 / R1) + Iadj R2
  const checkVOut = () => constVRef() * (1 + derivR2() / inputR1()) + inputIAdj() * derivR2();

  // Vin Recommended :: V
  const derivVInRecommended = () => inputVOut() + 3;

  updateTextInputFromText('calc-r2__deriv-iref', derivIRef().toExponential(2));
  updateTextInputFromText('calc-r2__deriv-r2', derivR2().toFixed(0));
  updateTextInputFromText('calc-r2__check-vout', checkVOut().toFixed(2));
  updateTextInputFromText('calc-r2__deriv-vin-recommended', derivVInRecommended().toFixed(2));
}

addEventListenerToId('calc-r2__input-vout', 'keyup', update);
addEventListenerToId('calc-r2__input-iadj', 'keyup', update);
addEventListenerToId('calc-r2__input-r1', 'keyup', update);

update();
