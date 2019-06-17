Journal 2019-06-17 - Client-Side Management of Remote Data - Case Study in Vue, Vuex, and TypeScript
========

Primary Goals:

- Minimize arbitrarily defined State Structure: State should be as consistent in shape as possible, and as minimal in complexity as possible.
- Make the most common operations convenient:
    - Initiating Requests.
    - Deriving Data.
    - Properly rendering Waiting and Error Ctates.
    - Checking any Defined Permissions.

This suggests some API details right off:

- Requests are managed via an Action.
- The Request Action implements the customary behavior of returning a Promise which either...
    - Resolves with a Value.
    - Rejects with an Error.
- Data in the State is stored in AsyncData, to enforce that:
    - In states where there is no Data available, it is not meaningfully accessible.
    - In states where there is no Error available, it is not meaningfully accessible.
    - Etc.
- Permissions for a Request should be consistent to access, mirroring the same way a Request itself is dispatched.

NOTE: Examples will be geared towards the use of [typesafe-vuex](https://www.npmjs.com/package/typesafe-vuex) because that's what the current project is using.



## Musing: Round 0

Some immediate thoughts:

- It's hard to be the "pile of functions with incidentally identical names" currently used for Permissions.  Anything else had better really bring value to things or else it's just added noise.
    - The only thing that could possibly bring value is if the Permissions included the Source Request.
