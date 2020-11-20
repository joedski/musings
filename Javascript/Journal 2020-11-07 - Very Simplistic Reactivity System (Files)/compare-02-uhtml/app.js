import { render, html, svg } from 'https://unpkg.com/uhtml?module';

function initState() {
  return {
    inputValue: 3.14,
    multiplier: 2,
  };
}

function MultiplyOption({ state, id, value, onchange }) {
  return html`
    <div>
      <input
        type="radio"
        id=${id}
        .checked=${state.multiplier === value}
        onchange=${() => onchange(value)}
      >
      <label for=${id}>Multiply by ${value}</label>
    </div>
  `;
}

function App(rootSel) {
  const root = document.querySelector(rootSel);

  return function update(state) {
    return render(root, html`
      <div>
        <label for="input-value">Input:</label>
        <input
          id="input-value"
          type="text"
          value=${state.inputValue}
          onkeyup=${event => update({
            ...state,
            inputValue: parseFloat(event.target.value),
          })}
        >
      </div>
      <div>
        ${MultiplyOption({
          state,
          id: 'input-multiply-by-2',
          value: 2,
          onchange: multiplier => update({ ...state, multiplier })
        })}
        ${MultiplyOption({
          state,
          id: 'input-multiply-by-3',
          value: 3,
          onchange: multiplier => update({ ...state, multiplier })
        })}
      </div>
      <div>
        <label for="deriv-result">Result:</label>
        <input
          id="deriv-result"
          type="text"
          readonly
          value=${state.inputValue * state.multiplier}
        >
      </div>
    `);
  };
}

// we could also use body.
const app = App('#app');

// Kick things off.
const appElem = app(initState());
