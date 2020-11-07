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
  // let inputVOut = () => 3.4; // V
  const inputVOut = () => getFloatFromTextInput('calc-r2__input-vout');
  // let inputIAdj = () => 50e-6; // A
  const inputIAdj = () => getFloatFromTextInput('calc-r2__input-iadj');
  // let inputR1 = () => 240; // Ω
  const inputR1 = () => getFloatFromTextInput('calc-r2__input-r1');

  // const constVRef = () => 1.25; // V
  const constVRef = () => getFloatFromTextInput('calc-r2__const-vref'); // V

  // Iref = Vref / R1 = 1.25V / R1
  const derivIRef = () => constVRef() / inputR1(); // V/Ω => A
  // R2 = (Vout - Vref) / (Iref + Iadj)
  const derivR2 = () => (inputVOut() - constVRef()) / (derivIRef() + inputIAdj());

  // Verification: Vout = Vref (1 + R2 / R1) + Iadj R2
  const checkVOut = () => constVRef() * (1 + derivR2() / inputR1()) + inputIAdj() * derivR2();

  const derivVInRecommended = () => inputVOut() + 3; // V

  updateTextInputFromText('calc-r2__deriv-iref', derivIRef().toExponential(2));
  updateTextInputFromText('calc-r2__deriv-r2', derivR2().toFixed(0));
  updateTextInputFromText('calc-r2__check-vout', checkVOut().toFixed(2));
  updateTextInputFromText('calc-r2__deriv-vin-recommended', derivVInRecommended().toFixed(2));
}

addEventListenerToId('calc-r2__input-vout', 'keyup', update);
addEventListenerToId('calc-r2__input-iadj', 'keyup', update);
addEventListenerToId('calc-r2__input-r1', 'keyup', update);

update();
