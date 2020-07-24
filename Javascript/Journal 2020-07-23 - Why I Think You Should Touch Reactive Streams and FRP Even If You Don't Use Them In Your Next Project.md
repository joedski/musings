Journal 2020-07-23 - Why I Think You Should Touch Reactive Streams and FRP Even If You Don't Use Them In Your Next Project
========

Hm.  I think it's down to just making explicit all those things that were implicit before, things like how events tie to state changes, how they might be shown to be explicitly related rather than sorta disconnected across a bunch of disparate method calls, etc.

It's like... Hm.  Hmmm.  Example.

1. User clicks a button.
2. A request is made.
3. The response data is put somewhere.
4. The view is redrawn.

Typically this is done like so:

1. A method is used as the handler for the button click event.
2. The method calls some request service.
3. That same method awaits on the request call, and upon resolution assigns the data to some piece of state.
4. A redraw is triggered either manually or by some automatic mechanism.

The issue I think I have with typical programming paradigms vs more reactive paradigms is this: It's clear that clicks cause calls to the method due to the method being referenced, but it's not clear that the state is updated by the method anywhere other than inside the method itself.  There's a disconnect.  This of course is much worse the more complex the logic being implemented.

In a reactive system though, you'd instead phrase things like this:

1. We have stream of click events from the button.
2. Every stream is mapped to a request.
3. Every request state update is mapped to a data update, which itself has an initial value.
4. The view is redrawn any time any datum stream updates.

While largely the same in intent (all the items are the same index in each respective list), there's a big difference: Where before the datum was stored as state somewhere else, with the reactive system the datum is itself _derived from the request state changes_, which is in turn derived from the clicks.



## Illustrative Example: Datum Being Derived From Events Instead Of Being Updated As a Side Effect


### Vue

```html
<template>
  <section>
    <div class="example__result">
      {{ datumMessage }}
    </div>
    <div class="example__controls">
      <button @click="handleRequestClick">Request Datum</button>
    </div>
  </section>
</template>

<script>
import AsyncData from '@/util/data/AsyncData';
import appRequests from '@/requests/app';

export default {
  data() {
    return {
      // We must jump between here and the methods to understand
      // what all is going on.  It's already bad enough the template
      // is elsewhere, but this too?  Ugh, too much.
      datum: AsyncData.NotAsked,
    };
  },

  computed: {
    datumMessage() {
      return this.datum.cata({
        NotAsked: () => '(Click the button...!)',
        Waiting: () => '(Request sent...!)',
        Error: (error) => `Error!  ${error.message}`,
        Data: (data) => `Data!  data.message`,
      });
    },
  },

  methods: {
    async handleRequestClick() {
      this.datum = AsyncData.Waiting;

      try {
        this.datum = AsyncData.Data(
          await this.$http.request(appRequests.getDatum())
        );
      }
      catch (error) {
        this.datum = AsyncData.Error(error);
      }
    },
  },
};
</script>
```


### RxJs (with the dreaded innerHTML)

```html
<html>
<body>
  <section>
    <div class="example__result" id="datumMessageEl">
      <!-- ...! -->
    </div>
    <div class="example__controls">
      <button id="requestDatumButton">Request Datum</button>
    </div>
  </section>

  <script>
    const rxops = rxjs.operators;
    const rxajax = rxjs.ajax;

    function getDatumRequest() {
      // Just using object form for illustrative purposes.
      return {
        url: '/api/datum',
        method: 'GET',
      };
    }

    const buttonEl = document.getElementById('requestDatumButton');
    const resultEl = document.getElementById('datumMessageEl');

    const buttonClicks = rxjs.fromEvent(buttonEl, 'click');
    const responses = requests.pipe(rxops.mergeMap(
      () => rxajax.ajax(getDatumRequest())
        .pipe(rxops.map(AsyncData.Data))
        .pipe(rxops.catchError(error => rxjs.of(AsyncData.Error(error))))
    ));
    const datumUpdates = rxjs.merge(
      buttonClicks.pipe(rxjs.mapTo(AsyncData.Waiting)),
      responses
    );
    const datum = datumUpdates.pipe(rxops.scan(
      update => update,
      AsyncData.NotAsked
    ));

    const datumMessage = datum.pipe(rxops.map(d => d.cata({
      NotAsked: () => '(Click the button...!)',
      Waiting: () => '(Request sent...!)',
      Error: (error) => `Error!  ${error.message}`,
      Data: (data) => `Data!  data.message`,
    })));

    datumMessage.subscribe(next => {
      resultEl.innerText = next;
    });
  </script>
</body>
</html>
```
