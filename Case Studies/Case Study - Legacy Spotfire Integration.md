Case Study - Legacy Spotfire Integration
========================================

I recently ran into a fun case of working with a tempermental API.  At work, we have a bunch old Spotfire servers running various things that Spotfire servers do, the issue being that we have to try to coerce the finnicky beasts into some semblance of predictability so that we can present our users with, if not functioning reports embedded in our larger app, at least error messages telling them something went wrong.  An error message is better than a blank screen.

I thought I'd take a moment to write up how I approached this as an example of the hurdles one may have to jump through when working with external services. (Or internal services in the face of possible unreliability!)



## To Set the Scene

Before I could even start to devise steps to set things up, I needed to start with what I had, and what I actually wanted, then figure out what dependended on what.

What I Had:
- Spotfire WebPlayer 7.5 Docs
- Spotfire Server URL
- Spotfire Report Parameters:
    - Report Path
    - Report Page

Version 7.5 is positively ancient, given that as of writing (2018-11) the actual product is on version _12_.  But this isn't a greenfield project, this is integrating with existing legacy stuff.

Moving on.

What I Wanted:
- Spotfire Analysis Document
    - To get this, I need a Spotfire WebPlayer Application.
- Spotfire WebPlayer Application
    - To get this, I need the Spotfire WebPlayer API.
- Spotfire WebPlayer API
    - To get this, I need the Spotfire API Script.
- Spotfire WebPlayer API Script

Okay, that seems reasonable enough.  We should be able to do just the following:
1. Ensure the Spotfire WebPlayer API Script is loaded.
2. Once we're sure it's loaded, create an Application.
3. That done, open a Document.
4. Data!

Of course, this is real world, so it's a bit more complicated than that...


### Issues

Now, I'm not the first one on this rodeo, so there's a lot of existing code in our app dealing with the myriad ways things can go wrong.  To wit:

1. We have multiple Spotfire Servers we're targeting.
    - The Spotfire URL is not a separate parameter just for completeness' sake, it's there because we have multiple different servers.
    - When you load the Spotfire WebPlayer API Script, it, reasonably enough, puts the Spotfire API on `window.spotfire`.  Just a few sub-issues here:
        - The Spotfire WebPlayer API Script for 7.5 does not wrap the initialization in a closure and keep a private reference to an internal variable or anything like that.  Everything is made with the assumption that it's the only WebPlayer API Script on the page, and basically references other parts of the API via `window.spotfire`.  Which would be fine, except...
        - The Spotfire WebPlayer API Script for 7.5 is served with a Target Proxy Server hardcoded inside it.  Now, we could possibly work around that by proxying the request through our own server and wrapping their script that way, but...
        - The Spotfire WebPlayer API Script is also gated behind SSO Login.  This means only the client can get it.  We could possibly wrap the script on the client, but...
        - The Spotfire WebPlayer API Script endpoint does not have any CORS headers defined, and our CSP isn't set to allow AJAXing remote scripts.
2. The Spotfire WebPlayer API Script doesn't always load, or load before we lose patience.
    - Sure, pretty standard fare for loading external resources, but this happens with more than a little regularity, so much so we've been given our own resource pool.
3. The Spotfire WebPlayer Document doesn't always successfully open.
    - Sometimes it just sorta hangs.
4. The Spotfire WebPlayer Document sometimes opens to the wrong page, and we have to try to coax it back to the right paeg.
    - I'm not even sure why this happens, but it does!  It at least occurred often enough that there's a code path for handling this case.
5. Sometimes, things just take way too long and it's easier to cut our losses and show a Timeout error.
6. On mobile Safari (and only mobile _Safari_?) you can only load one Document at a time.  If you want to open multiple Documents on the same page, each must wait its turn to start loading.
7. When working with a Spotfire WebPlayer Application, there's one place and one place only all errors from interacting with it come from: The handler you pass to `Application#onError()`.
    - Document failed to load for some reason?  Filters failed to apply?  Couldn't select something?  Spotfire did a scheduled refresh?  All those flow through that one callback.

All that's just to get the document open and ready for interaction!  I'm not even touching actually interacting with it, which is a real treat.

Points 2 through 4 require just a bunch of checking and reinitializing, but point 1 requires a bit bigger of a change.  After a few hours of tooling around with ideas, I finally came to the only solution that worked: More Iframes.  Basically, if we can't separate the Spotfire WebPlayer APIs because they all assume `window.spotfire` is theirs to manipulate, just give them all their own `window`s!  Sure, they can't directly talk to each other, but our app is already handling that anyway.

So, after all that, our nice simple list of steps from above is bloated into this:
1. Wait for our turn to load our Document.
2. Try to show the Document within a given timeout (15 seconds or so):
    1. Ensure the Spotfire Iframe is loaded. (this is the easiest part!)
    2. Load the Spotfire WebPlayer API Script in the Iframe.
        1. If the Script errors while trying to load, try one more time; otherwise, fail with that error.
        2. Otherwise, the Spotfire WebPlayer API is theoretically ready to use.
    3. Create an Application and try to open a Document.
        1. If there's `ErrorOpen` error, try this step one more time; otherwise, fail with that error.
            1. That includes creating a new Application, at least in our current code.  It seemed to work, so I didn't feel like knocking it.
        2. Also, keep in mind the error handler used to catch this error must also handle _other_ errors if everything succeeds in opening.
    4. Make sure the Document is open to the correct page.
        1. If it's not, try step 3 one more time; otherwise, fail with an error indicating we couldn't open the Document properly.
    5. If at any point the timeout elapsed, immediately discard all work.
        1. If it was the first time it elapsed, go back to step 1; otherwise, fail with an error.
3. Regardless of whether we failed or succeeded, notify that we're done so that the next Document can take its turn.



## Slicing Concerns

To start, I needed to refactor some things apart:
- The turn-waiting was previously handled by an interaction between each Document and the page containing them.
    - I decided to separate this out into a global service so that Documents could manage this themselves rather than having to contaminate other parts of our app with that code.
- The Script loading is now more complex in that it must manage an iframe.
    - I created two parts for this:
        - A top level route in our app which loads _only_ the Spotfire script and creates a container div for the WebPlayer.  Keeps things nice and slim, there.
        - A component that creates an iframe that loads that top-level route.  It then emits events to signal various stages of loading.  It's nice and simple.
- The Document loading and retrying is shoved into its own component, which itself contains one of those Script Loading Iframes.

The first two are fairly straight forward, so it's the last one I'll be discussing here.



## Implementing The Steps

The first time around, I'd gotten everything into an event-driven imperative mess, and that was before I realized I'd forgotten to make the timeout effective across all of the steps, and just after adding support for retries when checking if the Document opened to the correct page.  It had already become an intractable mess, not really any better than our current code except that it was now two piles of spaghetti instead of one.  As they say, there must be a better way.

Given how complex this was, I really needed to separate out the actual work from the over all narrative; break the work piece into one part which manages the whole story, and the adjunct pieces that actually carry out the actions.  A separation of coordination and execution, if you will.  That way, the main narrative code would more resemble the outline above, rather than ... well, not.

```js
function * narrative(ctx) {
    yield this.waitOurTurn()

    let attempt = 0

    try {
        while (true) try {
            this.emit('load:begin', { attempt })

            const timeoutId = yield this.throwOnTimeout(
                ctx.timeout,
                () => Object.assign(new Error('DocumentTimeout: Document Load Timeout Expired'), {
                    errorCode: 'DocumentTimeout',
                })
            )

            while (true) try {
                const { spotfire, spotfireContainerId } = yield this.loadSpotfireScript({
                    spotfireUrl: ctx.spotfireUrl,
                })
            }
            catch (error) {
                if (error.errorCode === 'DocumentTimeout') throw error
                if (attempt + 1 >= ctx.maxAttempts) throw error
                ++attempt
                continue
            }

            const { spotfireApp, analysisDocument } = yield // ... TODO!
        }
        catch (error) {
            clearTimeout(timeoutId)
            if (attempt + 1 >= ctx.maxAttempts) throw error
            ++attempt
            continue
        }
    }
    catch (error) {
        this.emit('load:error', error)
    }

    return
}
```
