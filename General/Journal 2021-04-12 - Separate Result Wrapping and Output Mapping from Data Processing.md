Journal 2021-04-12 - Separate Result Wrapping and Output Mapping from Data Processing
========

If you have a function whose body can be broken down into "actual logic" and "wrapping results for return to caller" then you should probably separate that into 2 layers.

This way, the "actual logic" part can be re-written from "saving return value to local var" form into "early return of return value" form.  From there, the wrapping simply operates on one call instead of a variable that could be affected by many different parts.
