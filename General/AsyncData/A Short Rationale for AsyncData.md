A Short Rationale for AsyncData
========

Why AsyncData?

- There are two general time periods in programs: now, and later.
- For active UIs to feel responsive, we need to always be interactive or at least animating now, every instant.
- However, our data is located in the API, far away.
- We can request data now, but it will only arrive later.
    - How much later?  Dunno.  Maybe a quarter second, maybe several seconds.  Whatever it is, it's later, and so it's not now.
- Problems:
    - Our templates can only render with what we have now.  _Our templates are synchronous_.
    - Our data can be requested now, but will not arrive now, only later.  _Our data is asynchronous_.
- Solutions:
    - Write templates and logic so that we always deal with only what we have now.
    - Explicitly encode the notion of asynchronicity into our data, and write all data access against that notion.
- Proposal: AsyncData, a "tagged sum"/"algebraic data type" which wraps the data (or error) within a status type.
    - By using a single data type for all request data and providing basic operations for that data type, all asynchronous data access throughout the entire app is now uniform.
    - No need to keep re-coding null checks, status flags, error messages, etc.  Just derive them as needed from the AsyncData.
    - AsyncData is itself always a synchronous value.  It might change later to another AsyncData, but it will always change to another AsyncData, rather than changing from null to an object or some other weirdness that has to be memorized for every case.
    - Using AsyncData with its `#map` method allows us to state how we'd like to transform the data regardless of the current status of the request.
    - Using AsyncData with its `#getDataOr` method allows us to specify what the default value is when we don't actually have the data, and specify that default at the point of use where it's most relevant, rather than somewhere else hidden away.
    - By dealing with AsyncData, which is always a synchronous value, we can derive from either the AsyncData or the mapped-and-safe-extracted values within.
        - Importantly, things like "should we show the spinner" become simple computations: we define the spinner state as being derived from "are any of these AsyncData in the Wating case right now".

Why The Four Cases?

These reflect the 4 states of some asynchronous data or process:

1. NotAsked: The data has not been requested yet.
2. Waiting: The data has been requested, but has not arrived yet.
3. Data: The data has been received!  Yay.
4. Error: Something went wrong somewhere and here's an error telling you what happened. (hopefully, anyway.)

NotAsked isn't used much in reads/queries, but is very useful in mutations/forms, where the initial state of the form response is NotAsked because the user hasn't submitted it yet.  Afterwards, we can show errors if it failed validation or something, or show and react to success.
