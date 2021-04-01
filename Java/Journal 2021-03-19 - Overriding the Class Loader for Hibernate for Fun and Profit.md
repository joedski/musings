Journal 2021-03-19 - Overriding the Class Loader for Hibernate for Fun and Profit
=======

It's for entirely legitimate reasons!  Really!

In short, you can set any `java.lang.ClassLoader` (or class path to one) for the `hibernate.classLoader.application` config property.  What can you use this for?

Yanno, Hibernate's `@Filter` annotation seemed so neat, but I really hate that it's a _per session toggle_.  WHY.  You can't set it per-query!  Dumb.  Useless!

The reason I hate this is because you have to toggle it per session, which means it's toggled at the top level, which means you've changed a global switch that affects code deep down within the application layers.  It's confusing and hidden.  I do not like it.

On top of that, the one case where it could've been useful, dealing with historical vs current data in a soft-delete/versioned data model, I need to be able to switch between historical or current on a per-query basis.  It's exactly not the sort of thing that should be toggled per-DB-connection-session.

`@Where` seems like it would be perfect for this too, except that that isn't togglable at all.  It can be used by subclassing each entity I need this on and adding the appropriate annotation but when I've got 30+ different entity types to deal with that's a hard No Thank You.

This is exactly the sort of thing that should be dynamically generated or otherwise processed through some standard mechanism.

So what's this got to do with ClassLoaders?

The ClassLoader specified at `hibernate.classLoader.application` is used by Hibernate to load classes when processing JPQL and Criteria Queries.

Sprinkle on a bit of Javassist, and you can create subclasses with annotations on the fly!

Given that, you can do things like `FooEntity.$Deleted`!  Or `BarEntity.$Deleted`!  Or `BazEntity.$Deleted`!  All with just one definition!
