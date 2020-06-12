Journal 2020-04-29 - Periodic Update on My Opinions in Front-End App Architecture
========

It's strange I don't yet have a journal where I talk about this, besides some piece about Integration Points and Orthogonalities and other big mysterious words that I use to sound pompous.  So, I'm going to try to rectify that.  Probably try and fail, but eh, usually things take a few drafts to settle into place.

This is going to be written from the point of view of a Vue project, with things organized by particular Vue libraries, but can likely be applied to many different projects where you've got a fat web client.

Ultimately the goal is a seemingly simple one: create an architecture such that better decisions are easier to implement than worse decisions.

If this kinda starts to make Vue look like Angular with a slightly different skin, then, well, now you know why Angular was the way it was.



## Some Words About Words

- Controller: When I say "Controller" in this document, I don't mean any particular kind of Controller (route, view, whatever) by this.  Rather, I mean "something which encapsulates a certain unit of behavior".
    - Service Controllers are Controllers that are general across your application.
        - That is, a Service Controller is what implements the behavior of the given Service.
        - "Service" and "Service Controller" can usually be used interchangeably.
        - "Service" can be taken to refer to the interface that the "Service Controller" implements the behavior of, if you want to split hairs.
    - Delegate Controllers or Sub Controllers are what I call units of encapsulated behavior that enable reusability of that behavior across Vue Components.
        - The Component's Controller instantiates those Delegate Controllers and wires them up.
        - This is basically how functionality in the Composition API is, well, composed, but the way Delegate Controllers are defined is different there versus how they're defined for the Vue Object Component API.
        - You can blame iOS for the "delegate" language.



## General Approaches

Ideally, you want to avoid Spaghetti in your code.  Spaghetti is best made with noodles, not code.  Spaghetti made of code leads to headaches and upset stomachs.

- In general, keep integrations/installations of services/plugins/whatevers as close to the entry point as possible.
    - If you're concerned about bundle size, prefer implementing a (mostly) transparent lazy loading methodology rather than spreading imports all over the codebase.
- In general, keep import hierarchies as shallow as possible.
- In general, the View components that render the Routes are where specific combinations of State, Services, etc, are tied together.
    - That is, those View components are where the identifying information in the Route is combined with the data access of the Services/Stores to get the specific data to show to the user.
- In general, state specific to a View should live at the View components, and should never be accessed by other Views because that's Spaghetti.
    - If you need to access data specific to one View in another View, consider if you really need to make a Service to handle that data instead.
- Because in general, all Views should be written as if they are the only View in the app.
    - If a View needs data from a Parent View, it should be passed down via Props and treated as immutable.
    - However, it's better to just re-request the data and have provisions in your request service to deduplicate such requests.
- In general, data retrieved from any remote services should never be mutated.
    - If you need a specific piece of it, created a computed prop.
    - If you need a modified version, track the user edits as separate state then create a computed prop showing the old data transformed by the user edits.
        - If the nature of the edits means it's easier to just directly mutate an object, then deep-clone the original datum.
    - Only mutate data directly if profiling shows it's necessary for efficiency, otherwise you're wasting dev time by creating code prone to Spaghetti.

Hopefully some of this looks familiar.  They are extensions or extrapolations of many general principles of clean coding with a dash of _actual_ RESTfulness.

- Separation of Responsibility.
- Small, composable units of functionality.
- etc.

If this makes things start to feel like a bunch of disconnected pages that could be static HTML... That's intentional.

And, if this makes it sound something like a Spring Boot application, just with Route Views instead of Controllers, then... Well, I like to think there's a reason for that.  (Technically the Route Views' _Controllers_ are what combine all the Services together to the specific use cases, sooo not actually so different even in that respect.)



## How I Use Various Libraries And Other Things


### Vue Itself: Components and Views

- A few kinds:
    - Common Components: These are not (usually) associated with any particular Route, and are usually used by many Views.
        - Can be thought of as app-specific library components.
        - These are usually free of any route-specific or state-specific behavior, but that is not always the case.  Sometimes they do depend on global state, but are reused so much that making them a Common Component is worthwhile.
    - Shared Views: Views that are used across multiple Routes.  It's not always common, but it does happen.
    - Views: Non-Shared View Components are specific to a single Route.

#### When To Break Views Into Separate Components

> TK: More thought needed here.

It helps to write Views in at least 2 passes:

1. Get it to work.
2. If it's too big, break it into logical sub views.

Determining when it's "too big" is usually a matter of judgement, but when you can write your component state like this:

```js
export default {
    data() {
        return {
            thisPart: { /* ... state for `thisPart` */ },
            thatOtherPart: { /* ... state for `thatOtherPart` */ },
        };
    },
}
```

Then you probably want to break `thisPart` and `thatOtherPart` into sub-view components.

This is especially the case if you have repeated units of interaction on your page.  Sometimes, that's indicative of not just sub-views, but actual reusable components that should be placed in the Common Components section of your app.

Another way to determine if you need to break things up: If you're making a card-based interface, then you've got free division of your UX already.

If you have a group of controls for, say, a table or chart, that itself can usually be captured into its own component.  State can then be managed by either just emitting a whole new object, or by `.sync`ing a bunch of separate properties.  If `.sync`ing a bunch of separate properties, I recommend grouping them into an object anyway, since that keeps them together in the `data()` definition, and can make it easier to split things into sub-views later if necessary.


### Stateful Child Components

Sometimes you'll encounter or be tempted to implement what I will refer to as stateful child components.  Examples of such things include any form components, Vuetify forms, Bootstrap Vue tables, etc.  Basically, anything that maintains internal state instead of expecting the parent to always manage that state.  Exercise caution around such things.

My advice here is to always keep things simple.

- If your parent component does not need to control the state, then it is okay to leave all that state in the child components and not worry about it.
- If your parent component does need to control the state, then it should always control the state and override the child components.

Not sticking to one of these means you now must synchronize state, which almost always means tracking extra state in the parent.  This is annoying.

If you have certain cases where you do need to do this, because you must coordinate state across multiple components (e.g. Table + Pagination (because you need a different pagination style than they give you)), consider instead creating a wrapper component that pre-composes those things and handles such state coordination so that you can then deal with it in one of the two manners above.

If you sometimes need to arrange things automatically, slots + flex-box + `justify-content: spaced` may be your friends.


### Vuex

- Vuex state is application-global state, it is reachable by every module.
- In how I think of it, there are 2 general buckets of Vuex State:
    1. Service State: Requests, Notifications, (Shared) Forms, etc.
    2. Application General State: User info, credentials, etc.
- I do not like using Vuex state for View-specific state as that all too frequently ends up with every View touching every other View's state, which is Spaghetti.
    - Instead, I recommend using Component State for such things.
    - If you actually do need a View's state to persist across navigations to that view or be used by other views, consider if what you have/need is actually a Service of some sort.
- I also do not like directly using Vuex.  Rather, I prefer to use it as the "persistence layer" and wrap access to in Service Controllers that View Components (among other things) use.

#### On Vuex for Route-View State

The issue I have with using Vuex for Route-View state is basically this: it creates a tight coupling between the Route-View Component and the Store.

- Why is the coupling tight?
    - Because any Vuex Module that is specific to Route-View is defined by the needs of that Route-View.
- Why is this bad?
    - Because the Vuex Module is globally defined, which allows easy access to it from any other Route-View.
        - If any other Route-View uses that Vuex Module, then it must be assume all Route-Views may potentially use it, which means many more tight couplings.
    - Rather, one should create the architecture such that good decisions are easier to implement, and bad decisions are harder to implement.

#### On Vuex Getters

Vuex Getters are for a few things only:

- Returning specialized getter functions
- Returning cached derived data

Vuex Getters should _never_ be used just to directly return a part of state.  These are useless getters and needlessly bloat your application.

And if you follow the Service Controllers recommendation above, you don't need to worry about changes to state affecting the rest of the code anyway, because the Service Controllers themselves are the only things that need to change.

#### Using Vuex for Service State

Services should each have their own namespaced Vuex module, and include things like Requests, Forms, Notifications, and other such cross-cutting concerns.

Not all cross-cutting Services require state, but those that do should have a Vuex module as that backing state.  Some Services may not require any of their own state, but may instead be compositions of stateful services.

Try to keep Vuex-backed services small and targeted, as it makes them significantly easier to unit test, and possible to extract for general use.  Create the minimum number of tools possible required to build other friendlier interfaces.  The fewer core tools, the less code that needs unit tests, and the easier they are to reason about, and therefore compose.

Remember that the low level tools do not need to be friendly to use, they need to be simple and well defined.  Then you use those low level tools to build the friendlier tools.

#### Using Vuex for Application General State

Application General State can be thought of as a special case service that is specific to your application.  As noted, it stores things like info on the currently logged in user (or, more likely, just an ID so you can retrieve the data via the proper API Request.), that sort of thing.  For many apps, it should be fairly minimal.

Especially if you treat API-requested data generally through some requests module.


### Vue Router

A short summary of how to use the Router without hating everything:

- Routes should not deal with the data itself, only about identifying locations.
- Services should not deal with which specific data they have, only with the data they have generally.
- Route-View Components are the only thing that deal with the specific data.
    - Route-View Components take the identifying information from the Route and pick out the specific data from the Service.
    - Different Route-View Components may use the same identifying information to make different API requests because they need different data related to the same identifiers.
- If a place in your app can be navigated to via button, link, or whatever else, then it must have a Route.
- Route Paths should follow RESTish practices, although the Resource you're identifying isn't some datum but rather some View or Interaction.

And now some rules to follow, as your life (or at least happiness) depends on it:

- Do not use Vuex for Route Location Information.
- Do not use Vue data props for Route Location Information.
- All Route Location Information must be defined by Route Config and be controlled by the Router.
- All navigation must be driven by Routes, Route Parameters and controlled through the Router.
- Do not use Routes to pass actual data, as this creates a tight coupling between the to-route and any other component navigating to it.
- Do not manually build route paths, only use route names.  String building and parsing are fragile, and paths are arbitrary strings subject to change without reason.
- If you do not heed these proscriptions, your codebase is your punishment, and the punishment on every future dev who must work on it.

Why am I so dogmatic about the above?

- Working on projects that don't follow those rules is Painful, with a capital P. (that rhymes with T that stands for Tech Debt...)
- Not following those rules makes test automation significantly more difficult.
- Not following those rules makes linking users to specific pages impossible.
- Not following those rules makes normal browser navigation and bookmarking difficult or impossible.
- Not following those rules makes bug reporting and repro more difficult.
- Not following those rules almost always results in tight couplings between any component that wants to send the user to a specific view/route and that targeted view/route.
- Not following those rules means navigation is inconsistent: sometimes you need only push a new route, other times you must both set state and push a new route at the same time.
- Attaching anything that is not just params to a route is not supported by the Router API, and this is intentional.  It might work today, but it might not work tomorrow.
- And so on.

#### Tabbed Views

Because this inevitably comes up, here's some specific dictates regarding tabbed views:

- If the tabs should be linkable, and should be navigable directly to from other parts of the app, then each tab should have a separate route, and the current route _is_ the backing state for the "currently selected tab" state.
    - Determine up front whether or not they should push or replace the current location, and which tab is the default tab.
- If the tabs are not linkable, determine if losing the "currently selected tab" state on navigation away is annoying.
    - If it is not annoying, then do not worry about persistence.
    - If it is annoying, consider putting the backing state into the Route.
        - If there are multiple tab sets, then use Route Query Params.


### Breadcrumb Components

Just because this frequently comes up, I have a special ~~cirle of h~~ section for them.

- I believe a Breadcrumb is best represented as a list of breadcrumb items.

Breadcrumb Items are fairly simple on the surface:

- Each breadcrumb item is either a title, or a title + location.
- Each breadcrumb item must be ignorant of any other breadcrumb item.

For best sanity, the Breadcrumb must follow one simple rule:

- The Breadcrumb does not create definitions for breadcrumb items.
    - Otherwise, this creates a tight coupling between your Breadcrumb and every single other View in the App.  This is a maintenance headache and is basically Spaghetti One Step Removed.

Where are those definitions placed?  That depends on your Breadcrumb operating model:

- Having Navigation History based Breadcrumb Items requires tracking said history elsewhere, but not on the Breadcrumb because multiple places may need access to that.
    - You may have a History service that itself is separate.
- What I've seen more commonly: having Hierarchy based Breadcrumb Items does not require tracking any more state than already exists in the Route Definitions.
    - Which means the Breadcrumb Item Definitions live on the Route Definitions.
    - Which also means they do not live in the Breadcrumb.

Vuex Router supports a notion of Metadata being attached to Routes, either in the Route Definitions themselves, or attached by Navigation Guards.  Breadcrumb Item Definitions are one thing that Route Metadata is useful for.

The reason these live on the Route Definitions and not in the Breadcrumb Component is simple:

- Route Definitions are Configuration.
- Breadcrumb Item Definitions are specific to each Route.
- Therefore Breadcrumb Item Definitions are also Configuration.
- Components are not Configuration, they are a generalization over all possible parameters to a given Route.  (Though some routes have no parameters, and some parameters produce "not found" results, but that's all part of else-case handling.)

How do you write a Breadcrumb Item Definition separate from any component context?  Dependency injection.

```js
const someItem = ({ $store, $route }) => { /* ... return something. */ };
```


### API Requests

Axios is a pretty good place to start when dealing with API requests.

Fun fact: every request in Axios can specify its own Adapter, which means every request in Axios can actually hit a different async service, which means you can use Axios as an interface for any request/response based communication system, so long as you're fine phrasing everything in terms of HTTP requests/responses.

Fun fact: this makes every request instantly stubbable for testing.

My current (as of 2020-05-01) favorite method of dealing with API requests is a light wrapper around Axios (which itself is already a wrapper) that exposes request data via [AsyncData](../General/AsyncData/README.md) objects.

#### The Requests Module

My preferred requests module is very simple at its core, and does only a few things:

- Dispatches a request, as only a side effect.  You do not get back a promise, that must be read separately.
- To keep things tidy, a few special behaviors apply:
    - By default, all requests to the same endpoint (impl detail: same request key) are deduplicated down to one request.
    - By implication, requests made to a given endpoint (key) before the current request has resolved do not result in a new request, but are deduplicated.
    - This allows every user (usually Route-View Components) to make requests independently, without knowledge of anyone else.  Thus there is less implicit coupling between components.
- Reads request state.  Low level tool used by other things.

There are some basic derived things it provides, if only because most abstractions built atop it need them:

- Reads request promise.
- Reads request data, returned as [AsyncData](../General/AsyncData/README.md).
- Dispatches a request then returns the promise for chaining.  Promise always resolves to void, never rejects.  This is used when needing to chain on request finishing, but not on the response itself.
- Dispatches a request then upon promise settlement reads request data or throws.  This is mostly used when submitting forms or doing other such one-off operations.

A few other things:

- The Requests Module does not transform server data before storage.  Rather, anything using the data can transform the data received from the server in a manner specific to its own use case.
    - This means fewer interfaces to memorize: what the API server's docs show you is what you get, and any view-specific transforms of that data are where they should be: on that view.

#### Why AsyncData (Short Version)

- Request state (NotAsked, Waiting, Error, Data) is up front and obligated.  You can't ignore it, and this is good.
    - Normally, you must deal with request state separate from the requested data, which is error prone because humans are forgetful.  By putting it front and center, it is explicit.  Wonderfully and horribly explicit.
- Request state is synchronous, meaning you _always_ have a defined value, even if that value is "NotAsked".
    - This means you can _always_ render something based on it.
- No bikeshedding on default values: anything using the data picks the default value appropriate to its own use case.
- Vue Reactivity friendly.


### Global Event Bus

There are a few cases where a global event bus is useful, but there are some things to keep in mind:

- Like a well defined Requests Module, your Events all have specific types associated with their names.
    - You may want to encode this information in explicit code rather than implicit usage, similar to how Requests are encoded with Request Options Creators.
- You will want a well defined Service wrapper whose implementation takes care of deregistering listeners upon component destruction.  Failure to handle this will inevitably lead to hard to debug issues that only happen after a series of steps that no one thinks to write down.
    - Basically, same as any event emitter only worse because the event bus itself is never deallocated in the app's lifetime, because _every component is touching it_.
