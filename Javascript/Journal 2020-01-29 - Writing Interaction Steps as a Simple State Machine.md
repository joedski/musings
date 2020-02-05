Journal 2020-01-29 - Writing Interaction Steps as a Simple State Machine
========

State machines are simple enough to understand, if annoying and verbose what with bringing all the possible states to the fore in a very verbose and explicit, and sometimes most unhelpful, manner.

I wonder how onerous it is for designing short sequences of steps, though?



## Initial Whack: Switch

If you enumerate your possible states, which is pretty much necessary for a state machine and why they can get annoyingly verbose, then a simple switch is enough to show things.  For a linear set of steps this even puts them all in order.

Sub-states or details will be encoded as pieces of state specific to a given major-state.  Or they'll just be left as ambient context state which is easier but pollutes every major state with every other major state's sub-state.  Sometimes separating that stuff is helpful, other times it's not necessary, so eh.  In absence of a strong abstraction/formalism, I'm not sure it matters that much outside of any specific case.

```js
// NOTE: ambient context attached to `this`.
function transition(nextState) {
    switch (nextState) {
        case 'initial':
            this.resetAllTheThings();
            break;

        case 'initiateUpgrade':
            if (this.hasMisingUpgradeConfig) {
                return transition('enterMissingUpgradeConfig');
            }
            return transition('validateUpgrade');

        case 'enterMissingUpgradeConfig':
            this.initUpgradeFormState();
            break;

        case 'validateUpgrade':
            this.validateUpgrade()
                .then(() => transition('prepareUpgrade'))
                .catch(() => transition('enterMissingUpgradeConfig'));
            break;

        case 'prepareUpgrade':
            this.prepareUpgrade()
                .then(() => transition('rebuild'))
                .catch(() => transition('enterMissingUpgradeConfig'));
            break;

        case 'rebuild':
            this.rebuild()
                .catch(() => transition('enterMissingUpgradeConfig'));
            // Special case: we actually have to wait until some data
            // from a parent changes to trigger a "success" transition.
            break;
    }

    this.currentState = nextState;
}
```

Obviously, this only works where each state is mutex with each other state, i.e. that there's one and only one state the stateful thing can be in at any given time.  If there's more to it than that, then, well, combinatorial explosion for you.


### Any Way To Handle That Special Case?

That looks pretty clean, and for a trivial interaction like that it is pretty clean.  But what about that special case?

Essentially the issue there is that we have to map certain events to transitions, where in that case specifically the event is `someParentData changed`.  This has to be accounted for anyway, as just as frequently that event is `user clicked this button`.  Why's that feel different, then?

I think it feels different because there are some cases where the event is not something the user does, nor is it something external, but rather it's something that the stateful thing itself controls.  This can be seen with `validateUpgrade` and `prepareUpgrade` above.  And, actually, `initiateUpgrade` too, which is technically in reaction to a user input.

Really it'd be just during the setup phase that you'd do that, then.

```js
const transitionEvents$ = Stream.mergeAll([
    submitButtonClick$.map(() => 'initiateUpgrade'),
    props.version$.pipe(
        didChange,
        gate(currentState$.map(state => state === 'rebuild')),
        map(() => 'initial')
    ),
    // ... any others.
]);

transitionEvents$.on(transition);
```

Eh.  Bit of a hodge podge of ... things, there, but something like that I guess.



## Alternatives


### Sagas?

Sagas might be a bit overkill.  Maybe.  Dunno.
