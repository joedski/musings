Journal 2019-05-23 - On Client-Side Management of Remote Data
========

Essentially, when managing Client-Side State to track Remote Data, don't organize things in terms of Business-Oriented Domains.  Rather, remember what you're actually building here: A small framework for managing remote data, its status, etc.

Not really much else to say there, really.  When using a central store, it should be its own subsystem which manages its own top-level slice.  When using a multi-store setup, it should have its own store.

Take for example Apollo.js, which uses its own internal Redux store for its state management.  However, it also gives use the option of using a slice of your own Redux store instead of its own internal store.  In either case, though, it's a slice of state that is oriented entirely towards the purpose of managing requests, remote data, responses, etc.
