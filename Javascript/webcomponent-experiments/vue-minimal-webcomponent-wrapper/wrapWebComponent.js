/* global _ */

const { wrapWebComponent, wrapRegisteredWebComponent } = (() => {
  function pascalCase(s) {
    const camelCasedVersion = _.camelCase(s);
    return camelCasedVersion.substr(0, 1).toUpperCase() + camelCasedVersion.substr(1);
  }

  function normalizeSlotContent(content) {
    if (! content) return [];

    if (Array.isArray(content)) {
      return content;
    }

    return [content];
  }

  /**
   * Render slots' contents into a flattened array of vnodes
   * patched to have attrs.slot set to the slot name.
   *
   * Note that content in the default slot doesn't need a slot
   * name set.
   *
   * Note also that, so far as I know, WebComponents has no
   * notion of passing attrs to slots.
   * @param  {Record<string, () => VNode[]>} scopedSlots Scoped slots of no arguments.
   * @return {VNode[]} VNodes whose data is patch to include attrs.slot.
   */
  function renderSlots(scopedSlots) {
    return Object.entries(scopedSlots).reduce(
      (acc, [slotName, render]) => {
        return acc.concat(normalizeSlotContent(render()).map(vnode => {
          // Raw text content should go into the default slot.
          if (slotName === 'default') return vnode;

          // NOTE: Need a better way to do this.
          // Though, Vuetify apparently directly mutates slot content.
          // https://stackoverflow.com/a/57829843
          // Maybe weakmap cache, too, just in case?
          // Or is that not usually something required?
          // Might need profiling to determine if that's necessary.
          return Object.assign(Object.create(vnode), {
            data: {
              ...vnode.data,
              attrs: {
                ..._.get(vnode, 'data.attrs'),
                // NOTE: Assuming this is not text content.
                slot: slotName,
              },
            },
          })
        }));
      },
      []
    );
  }

  function getPropNames(constructor) {
    return constructor.observedAttributes
      .map(_.camelCase)
      // NOTE: This only keeps get/set (and methods), not instance props.
      // Not sure if that's all we want, but it's probably advisable
      // since you can only react to updates in setters.
      .filter(propName => (propName in constructor.prototype))
      ;
  }

  /**
   * Creates a Vue component with Props, forwarding Attrs
   * and Slots with no Scope.
   *
   * Limitations:
   * - Custom Elements do not support a notion of Slot Scope,
   *   so your slots can only be unparametrized.
   * - Props must be defined on your Custom Element's prototype
   *   and have a corresponding attribute name in the Custom
   *   Element's `observedAttributes`.
   * @param  {string} elementName Name of the custom element as it's registered.
   * @param  {Function} constructor Constructor for your Custom Element.
   * @return {VueOptions} A wrapper Vue component definition.
   */
  function wrapWebComponent(elementName, constructor) {
    const componentName = pascalCase(elementName);

    // Separating these out, we still have reactive attribute names
    // for webcomponents that do not define corresponding interface-props
    // on their class.
    const propNames = getPropNames(constructor);

    const vueComponent = {
      // NOTE: Uncommenting this creates an infinite recursion
      // if it's the same name as the custom element's registered name.
      // This is because setting the `name` effectively adds this definition
      // itself to its own `components` option.
      // That's why you need to define the name for self-recursive components,
      // and why you should not set it here, at least not to the same name
      // as the custom element.
      // name: componentName,

      // TODO: Types?
      props: propNames,

      render(h) {
        return h(
          elementName,
          {
            // I've found I need to spread these to actually
            // setup reactive subscriptions.
            // I guess the async render to DOM doesn't occur
            // during reactivity registration time.
            attrs: { ...this.$attrs },
            domProps: { ...this.$props },
            on: this.$listeners,
            ref: 'wrappedElement',
          },
          renderSlots(this.$scopedSlots)
        );
      }
    }

    return vueComponent;
  }

  function wrapRegisteredWebComponent(elementName) {
    const constructor = customElements.get(elementName);

    if (! constructor) {
      throw new Error(`Cannot wrap component '${elementName}': no constructor registered for that name`);
    }

    return wrapWebComponent(elementName, constructor);
  }

  return {
    wrapWebComponent,
    wrapRegisteredWebComponent,
  }
})();
