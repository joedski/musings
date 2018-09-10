VDOMish View Libs and Compound Components
=========================================

1. [Comment on using Compound Components to attack a problem solved in React land using Context: Tabs and Tab Panes](ss-1)

[ss-1]: https://github.com/MithrilJS/mithril.js/issues/2148#issuecomment-393279589

I can't actually see the example they posted in [the first post][ss-1] because their link seems to be ~~dead, or at least~~ inaccessible due to the company proxy.  But, I surmise it goes something like this:

```js
const Component = {
  // ...
  view() {
    return m('div', [
      // Something like this is the main thing:
      m(Tabs, (mTab, mTabPane) => (
        m('div', [
          m('tabs__tab-set', this.tabs.map(tabDef => (
            mTab({
              tabId: tabDef.id,
              current: tabDef.id === this.currentTab,
              onpick: this.onPickTab,
            })
          ))),
          m('tabs__tab-panes', [
            mTabPane({ key: this.currentTab }, this.viewTabContents()),
          ]),
        ])
      )),
    ])
  },
}
```

I'm not sure what all you can pass as children in Mithril, they probably restrict it to VNode objects and some primitive values, so it'd have to be props.  [they did mention render props][ss-1].  It might be more `m(Tabs, { render: (mTab, mTabPane) => (...) })`.  Either way, this a parent to share state/state-mutation with children in a controlled manner, something usually done with context or passing props.  I usually did the latter.

> Update: This is essentially what they did, usage wise, just passing Components to use with `m()` instead of VNode-Creators.  The component itself was implemented using a Mithril Factory-Function Component to encapsulate state, but that's a technical detail.

I suppose if you wanted to maximize control while still encapsulating state, you could basically repeat the pattern with the Tab and TabPane components.

```js
const tabDefs = [
  {
    id: 'tab-a',
    title: 'Tab A',
    // this function could be passed some props...
    content() {
      return m(SomeThing)
    },
  },
  {
    id: 'tab-b',
    title: 'Tab B',
    content() {
      return m(SomeThingElse)
    },
  },
  {
    id: 'tab-c',
    title: 'Tab C',
    content() {
      return m(SomeThingElseEntirely)
    },
  },
]

const Component = {
  view() {
    return m(TabSet, ({ Tab, TabPane }) =>
      m('div.foo-tab-set', [
        m('div.foo-tab-set__tabs', tabDefs.map(def =>
          m(Tab, { key: def.id }, ({ current }) =>
            m('div.foo-tab', { attrs: { class: cx({ 'foo-tab--current': current }) } }, [
              def.title,
            ])
          )
        )),
        ...tabDef.map(def =>
          m(TabPane, { key: def.id }, def.content)
        ),
      ])
    )
  }
}
```
