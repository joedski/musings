# vue-lazy-loading-poc

> Demo of Lazy Loading Components with Potentially Heavy Dependencies

I use this to load things like Highcharts which, while useful, are heavy on the bundle size.  I don't want them affecting the initial load.



## How It Works

This is built on one assumption: That the bundle Webpack generates will load and evaluate any given chunk only once.  A pretty good one, I think.

This means if we dynamically import a given module in multiple places, it only gets downloaded and evaluated once, and thus any plugins included will only be installed once.

This is effected thusly:

- An example plugin that installs a component is included in `src/plugins/DemoDep`.
  - It registers a component named `DemoDepComponent` globally.
  - Anything that wants to use this component thus requires that the `DemoDep` plugin be installed prior to it instantiating.
- A component which uses `DemoDepComponent` is located at `src/components/ComponentWithDemoDep`:
  - The file `ComponentWithDemoDep.js` is an Async Component Definition which first imports `src/dependencies/InstallDemoDep.js`, then once that's done, imports `ComponentWithDemoDep.impl.vue`.
  - The file `src/dependencies/InstallDemoDep.js` handles actually importing the `DemoDep` Plugin itself and installing it to Vue.
  - The file `ComponentWithDemoDep.impl.vue` is a component which itself makes use of `DemoDepComponent`.



## Why This Way

Dependency installation occurs as a side effect of importing the appropriate module.  Since the installation of a given dependency is handled by only a single file, that load-and-installation process will only occur once in the app lifetime, even if multiple other modules depend on that one dependency.

While technically in this small example the dependency `DemoDep` could be installed by `ComponentWithDemoDep.impl` directly, that only works if that one and only that one component depends on `DemoDep`.  If two components depend on `DemoDep`, it must be moved to a separate file.  Keeping the Dependency Installations as separate files has the advantage of being cleaner and clearer in the code base, which is an advantage for any project that actually cares about code splitting.
