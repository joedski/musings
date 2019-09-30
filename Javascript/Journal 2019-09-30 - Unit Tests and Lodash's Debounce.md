Journal 2019-09-30 - Unit Tests and Lodash's Debounce
========

I recently ran into issues trying to test something that used `lodash.debounce`.  Or rather, a number of things that basically boiled down to one thing: the debounce was sometimes timing out before my `setTimeout` call with a lesser amount of time, and sometimes after.



## Current Solution

As of 2019-09-30, I've done this:

- Use a Minimum Time Quantum of 1/60 seconds (1/60*1000 ms).
    - This avoids issues with trying to use timeouts less than 10ms.
    - This also avoids issues with timing tied to `requestAnimationFrame`.
- Use a Minimum Unpausable Debounce Time of 3 * Minimum Time Quanta.
    - I've found this to be minimum dependable time to both avoid the above issues while still not stretching out the test.
    - I originally used 2, bit that still failed every 1 in 300-400 times.
- Use a Minimum Pausable Debounce Time of twice the Minimum Unpausable Debounce Time when doing any test that requires asserting after a timeout starts but before that timeout ends.
    - Since empirical testing showed that the above Minimum Unpausable Debounce Time seemed to work without noticeable fail, using twice that for the Minimum Pausable Debounce Time seams reasonable.  Then one can just wait half of that time, do assertions, and wait the rest of it (plus 1 quantum) afterwards, then do more assertions.
- Wait for the Given Debounce Time plus 1 Minimum Time Quantum when waiting for a given timeout to end.
- Wait for half of the Minimum Pausable Debounce Time when making assertions after a timeout starts, but before it ends.
- When validating that this does work, run unit tests ~~100~~ 200 times.  Hopefully if it works that many times, it should work in CI pipelines too.

When actually writing this out, prefer code that resembles the above to emphasize what is actually happening versus just raw values:

- Start a test by defining what the wait time is for that test:
    - `const wait = MIN_UNPAUSABLE_TIME` for Minimum Unpausable Debounce Time.  This signals that the test will _not_ pause part way through the timeout.
    - `const wait = MIN_PAUSABLE_TIME` for Minimum Pausable Debounce Time.  This signals that the test _will_ pause part way through the timeout.
- When letting a timeout elapse, ensure it definitely elapses by waiting for the given time plus 1 Minimum Time Quantum:
    - `await sleep(wait + TIME_QUANTUM)`
- When waiting for part way through a Minimum _Pausable_ Debounce Time, divide the given test's time in half to emphasize that "part way through this wait time" thing:
    - `await sleep(wait / 2)`
- Combine both of these ideas when waiting for the rest of the Minimum Pausable Debounce Time:
    - `await sleep(wait / 2 + TIME_QUANTUM)`

Obviously, this is not ideal since it means real time has to pass for the test.  Every 30 Minimum Unpausable Debounce Times is 1 whole second, which can add up depending on how thorough your tests are or how much you have to test.  Best try to isolate any debounce stuff to as small of a controller or utility as possible to keep real time waiting to a minimum.

This is probably a pretty good way to approach unit testing any JS code that depends on timing stuff where you can't control the timing implementation in any way, or can't expect to know what implementation is even used in the first place.

I'm still not really all that happy with this, since it's still trying to eliminate errors arising from timing-based nondeterminism, but I guess it pushes things down far enough below the noise floor that the periodic failure is tolerable.



## Exploration and Information Gathering


### Lodash's Implementation (As of 2019-09-24)

The way Lodash's `debounce` is implemented is quite interesting: It prefers `requestAnimationFrame` to check every frame and falls back to `setTimeout` if RAF isn't present, and uses `Date.now()` to actually determine if any given animation frame or timeout is the correct time to call the debounced function.

I don't know why this was done, and I'm sure there's an entirely good justification for this rather roundable implementation, but it's ultimately immaterial to my current matter.  All that matters is how they've implemented it, not why, because only how they've implemented it is doing to inform why I make the decisions in my own test setup.

Save their why for after my setup works, if I ever have time to spend on that.
