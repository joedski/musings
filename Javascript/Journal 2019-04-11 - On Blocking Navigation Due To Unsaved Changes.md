Journal 2019-04-11 - On Blocking Navigation Due To Unsaved Changes
==================================================================

I think this is the one case where you might use Alert.  The other option is of course to do the Route Change Blocking in-app, which is fine too.

In either case, you want to set up a standard hook.

When using Alert, you could have this in the Router itself, then anything that wants to have a Blocking Confirmation would just tell the Router "Hey, I have a blocking thing", then when that's cleared, well, they just clear it, and the user can navigate unmolested.

Using in-app modals or whatever, you'll also want to hook into Routing and do basically the same thing, except that you'll initially block navigation and toggle a global modal then only actually execute the navigation on confirmation.
