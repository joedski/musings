function importTemplate(importMeta) {
  // TODO: Global cache for templates?
  // Not sure that actually is necessary.

  const templateUrl = importMeta.url.replace(/\.js$/i, '.html');

  return fetch(templateUrl)
  .then(response => {
    if (response.ok) {
      return response.text().then(text => ({ response, text }));
    }
    else {
      throw Object.assign(
        new Error(`${response.status}: ${response.text}`),
        {
          response,
        }
      );
    }
  })
  .then(({ response, text }) => {
    const element = document.createElement('div');
    element.innerHTML = text;

    const template = element.querySelector('template');

    if (template == null) {
      throw Object.assign(
        new Error('Could not find template tag in element html document'),
        {
          response,
          text,
        }
      );
    }

    return template;
  });
}

class CalcFormTextField extends HTMLElement {
  static get elementName() {
    return 'calc-form-text-field';
  }

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });

    importTemplate(import.meta).then(template => {
      const instanceContent = template.content.cloneNode(true);
      this.shadowRoot.appendChild(instanceContent);
    });
  }
}
