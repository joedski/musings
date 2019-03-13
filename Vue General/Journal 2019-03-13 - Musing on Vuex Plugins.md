Journal 2019-03-13 - Musing on Vuex Plugins
===========================================

Vuex has the notion of Plugins, although those Plugins can't do anything to modify the Store Module Definition using the Plugin.  Can't think of a case that'd need that, and in such a case, you'd probably be better off just using a function that operates on the Store Module Definition itself rather than using a Plugin.  Plugins seem to be geared more towards automatic subscription and binding and such between the Store and other things.

What I was thinking of, an HTTP request handler, might be better handled by either a separate HTTP Module, or an HTTP Module + HTTP Plugin.

To wit:

- The HTTP Module would be a standard place, referencible by any other module, to make HTTP requests.
    - So, you'd do `dispatch('http/get', '/api/foo-service/foos')` or something from anywhere else in the store, because the `http` module is added as a Sub Mobule of the Root Module.
    - You could even have a helper that scopes pre-parametrized or transformed requests, so `dispatch('http/foo-service/get', 'foos')` or `dispatch('http/foo-service/post', ['foos', { title: 'The Bestest Foo' }])` or something.
- The HTTP Plugin would then subscribe to changes in the Root Module, do Commits, etc.
    - `AsyncData` aww yiss.
