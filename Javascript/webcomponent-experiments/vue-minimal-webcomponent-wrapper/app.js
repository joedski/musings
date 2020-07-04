const XTickingParagraph = wrapRegisteredWebComponent('x-ticking-paragraph');

Vue.config.ignoredElements = (Vue.config.ignoredElements || []).concat([
  'x-ticking-paragraph',
]);

const app = new Vue({
  el: '#app',

  components: {
    // NOTE: The wrapper cannot have the same name
    // as the custom element itself.
    CeTickingParagraph: XTickingParagraph,
  },

  data() {
    return {
      contents: [
        'First item',
        'Another item',
        'Yep it\'s an item',
      ],
    };
  },

  methods: {
    handleTick() {
      console.log('Tick...');
    },
  },

  render(h) {
    return h('CeTickingParagraph', {
      ref: 'customElement',
      props: {
        contents: this.contents,
      },
      on: {
        tick: () => this.handleTick(),
      },
      scopedSlots: {
        title: () => [
          h('h1', { attrs: { 'data-foo': true } }, 'Title...!'),
          h('h2', { attrs: { 'data-bar': true } }, 'Subtitle!'),
        ],
      },
    });
  },
});
