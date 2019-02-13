Get All Values in an Object Matching Some Path Spec
===================================================

More of just a personal amusement than anything.

Can I create a function with the interface `(PathSpec, Object) => Array<yeahwhatever>`?  Where `PathSpec` is an array of ... things.  Strings and Numbers for property and index access, and Functions for other things.  Sorta like `lodash.get` but assumed to return 0 or more values rather than 0 or 1 values, where 0 in `lodash.get`'s case is `undefined`.

It's gonna be flattening things together, but otherwise may be able to be recursively called?  Hm.
