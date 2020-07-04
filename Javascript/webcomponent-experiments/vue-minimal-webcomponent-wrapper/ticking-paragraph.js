// Well, it's actually a list, now, not a paragraph...
customElements.define('x-ticking-paragraph', class XTickingParagraph extends HTMLElement {
  static get observedAttributes() { return ['contents'] }

  constructor() {
    super();
    let shadowRoot = this.attachShadow({mode: 'open'});
    const template = document.querySelector('#x-ticking-paragraph');
    const instance = template.content.cloneNode(true);
    shadowRoot.appendChild(instance);

    this.contents = '';

    setInterval(() => {
      this.dispatchEvent(new Event('tick'));
    }, 500);
  }

  set contents(value) {
    this._contents = (() => {
      if (Array.isArray(value)) {
        return value;
      }

      // Empty string, false, null, undefined
      if (! value) return [];

      return [String(value)];
    })();

    const listItems = document.createDocumentFragment();

    this._contents.forEach(itemText => {
      const listItem = document.createElement('li');
      listItem.innerText = itemText;
      listItems.appendChild(listItem);
    });

    // // https://stackoverflow.com/a/22966637
    // const renderTarget = this.shadowRoot.getElementById('renderTarget');
    // const renderTargetParent = renderTarget.parentElement;
    // const nextRenderTarget = renderTarget.cloneNode(false);
    // nextRenderTarget.appendChild(listItems);
    // renderTargetParent.replaceChild(renderTarget, nextRenderTarget);

    // Can't do that, shadowRoot isn't really an element, or
    // can't be a parentElement rather.
    const renderTarget = this.shadowRoot.getElementById('renderTarget');
    while (renderTarget.firstChild) {
      renderTarget.removeChild(renderTarget.lastChild);
    }
    renderTarget.appendChild(listItems);
  }

  get contents() {
    return this._contents;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this[name] = newValue;
  }
});
