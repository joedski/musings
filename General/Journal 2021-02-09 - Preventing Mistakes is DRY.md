Journal 2021-02-09 - Preventing Mistakes is DRY
========

A common refrain in development DRY, "Don't Repeat Yourself".  This applies from the lowest level of the code all the way up to your process itself.

If you keep repeating certain mistakes, there's an opportunity to DRY things.

A big part of application programming is building your own safety rails, being your own OSHA.  Some of that is simply better practice and greater diligence, but a lot of that is writing tools that make doing the thing right easier than doing the thing other ways.  Don't delegate to diligence what can be solved by actual tools and enforced rules.

Examples:

- If you keep mixing "unsafe strings" (example: raw input from user) with "safe strings" (example: input with only permitted structures/tags/whatever), consider changing development practice to make that less likely.
    - At the very least, App-Hungarian Notation (`safeInput = safeFromUnsafe(unsafeInput)`) will make this sort of thing more explicit, but requires diligence.  This is the minimum you should do.
    - Use the typesystem or explicit wrappers to enforce these practices: don't deal in raw strings, but in wrappers that don't allow interaction between "safe" and "unsafe" strings.
        - In some languages, defining new types that are transparent wrappers around more basic types is very easy but still provides the above benefits.
        - In others, actual wrappers that require instantiation are necessary and the performance benefits and costs must be weighed.
- If you keep forgetting to reset a flag after some process is done, consider build a wrapper around such processes to handle setting and resetting that flag based on the process itself finishing.
    - For example in JS, instead of manually toggling a loading spinner at the beginning and end of a process, consider creating a small spinner manager that can set and unset that flag based on receiving a promise and that promise finishing.
- Keep learning the tools you are using, especially if you're building an application with a well established framework or toolset.
    - Often, though your construction in total will be novel, many parts and processes within it won't be.  Learning the toolset or framework better will often show you things that have been solved by others because they also ran into those same issues and processes.
