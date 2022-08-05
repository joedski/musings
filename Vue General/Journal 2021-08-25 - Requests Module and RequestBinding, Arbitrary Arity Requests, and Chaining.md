---
tags:
    - ui:tooling:requests

# prev:
---

Journal 2021-08-25 - Requests Module and RequestBinding, Arbitrary Arity Requests, and Chaining
===============================================================================================

RequestBinding is great for managing single requests, but that's only a subset of common use cases.  Among other kinds we have to deal with, we have:

1. [Request Chains](./Journal%202020-11-05%20-%20Requests%20Module%20and%20Fixed%20Request%20Sequences.md) where in it's actually a sequence of potentially-depnedent requests that we need to treat as a single one for our interaction.
2. Arbitrary Arity Requests, where in we may need to N requests in parallel to fetch N separate entities.



## Request Chains

As demonstrated in [a prior journal on this topic](./Journal%202020-11-05%20-%20Requests%20Module%20and%20Fixed%20Request%20Sequences.md), it's currently kind of obnoxious to do this.

```js
export default Vue.extend({
  data() {
    return {
      fileToUpload: /** @type {File | null} */ (null),
    };
  },

  computed: {
    fileTokenRequest() {
      return new RequestBinding(this, () => {
        return getFileUploadToken({ ...fileMeta });
      });
    },

    fileUploadRequest() {
      return new RequestBinding(this, () => {
        return postFileUpload({
          token: this.fileTokenRequest.data.getDataOr(null),
          file: this.fileToUpload,
          ...fileUploadMeta,
        });
      });
    },

    saveFileMetaRequest() {
      return new RequestBinding(this, () => {
        return postSaveFileMeta({ ...savedFileMeta });
      });
    },

    // Misc derivations, exact details not too important.
    fileMeta() {
      const { fileToUpload } = this;
      if (fileToUpload == null) return null;

      return getFileMeta(fileToUpload);
    },

    fileUploadMeta() {
      const { fileToUpload } = this;
      if (fileToUpload == null) return null;

      return getFileUploadMeta(fileToUpload);
    },

    savedFileMeta() {
      const { fileMeta } = this;

      if (fileMeta == null) return null;

      return this.fileTokenRequest.data
        .map(uploadData => {
          return someDerivationOf(uploadData, fileMeta);
        })
        .getDataOr(null);
    },
  },

  methods: {
    async uploadFile() {
      try {
        await this.fileTokenRequest.dispatchThenGetDataOrThrow();
        await this.fileUploadRequest.dispatchThenGetDataOrThrow();
        await this.saveFileMetaRequest.dispatchThenGetDataOrThrow();

        // Not really sure what else to do with it, so a tuple I guess.
        return this.fileTokenRequest.data.flatMap(tokenData =>
          this.fileUploadRequest.data.flatMap(uploadResult =>
            this.saveFileMetaRequest.data.map(metaSaveResult => [
              tokenData,
              uploadResult,
              metaSaveResult,
            ])
          )
        );
      } catch (error) {
        return AsyncData.Error(error);
      }
    },
  },
});
```

This is due to a few things where such processes are distinct from what `RequestBinding` expects:

1. `RequestBinding` expects to deal with single requests, but this is an aggregate of multiple requests, some or all dependent on others.
2. `RequestBinding` has no notion of sequencing, which is kind of important to that whole "dependent on other requests" thing.

How could we do this?

1. One way is to just build up a description of what we want to do, with each request stating its depnedency, then execute that description.
    1. This results in a sequence or tree, effectively, with each step describing what to do with the dependencies.
2. Another is to just discard that and have each thing written as an imperative sequence, since that's what JS likes.
    1. This is likely easier for people not used to either declarative or FP styles of programming, and so is likely to gain better traction at the cost of being able to programmatically manipulate requests.
        1. However, the cost of losing such power is likely not that much in most cases: the sorts of chains we deal with are nearly always Mutation requests.
        2. ... But, that doesn't mean there aren't Query requests that have dpendencies.

The first one is more fun to think about, though I'm honestly not sure how much there actually is to think about since you're just building a description and any execution that implements the intended behavior is good, but still.


### Imperative Sequential Request Style

If all we care about is a one-off process, there's actually little value to retaining the data: we'd just discard it when we reload the component anyway.

In that sense, the only reason to retain the data is if we need to show a success message on the current page.  Well, that and loading indicators of course.

```js
new RequestProcessBinding(this, async (params, ctx) => {
    const token = await ctx.dispatchThenGetDataOrThrow(
        // Just assuming this is still coming from a computed prop.
        getFileUploadToken({ ...this.fileMeta })
    );

    const uploadResult = await ctx.dispatchThenGetDataOrThrow(
        postFileUpload({
            token,
            file: this.fileToUpload,
            ...this.fileUploadMeta,
        })
    );

    // This no longer needs to be a computed prop, since it's specific to this request.
    const savedFileMeta = someDerivationOf(uploadResult, this.fileMeta);

    const metaSaveResult = await ctx.dispatchThenGetDataOrThrow(
        postSaveFileMeta({ ...savedFileMeta })
    );

    return {
        token,
        uploadResult,
        metaSaveResult
    };
});
```


### Inecremental Progress Updates

For the Imperative Sequence Style, just create a separate unit to handle that.

This seems like a reasonable first sketch:

```js
this.processProgress.start({
    increments: [
        { label: 'Asking nicely for file upload permission...' },
        { label: 'Uploading file...' },
        { label: 'Saving metadata...' },
    ],
    successLabel: 'Success!',
    errorLabel: 'Oh no!',
});

this.processProgress.markIncrementComplete(0);
this.processProgress.markIncrementComplete(1);
this.processProgress.markIncrementComplete(2);

this.processProgress.showSuccess();

this.processProgress.showError({
    message: error.response.statusText
});
```

Actually showing/hiding the progress component itself should be handled by just watching `ProcessRequestBinding.data.is('Waiting')`, this just controls the progress state.


### Description and Execution Style

This sort of thing always goes back to Separation of Description and Execution, doesn't it.

However, depending on how much description you want, you end up having to separate each request from how to produce their agruments.

```js
const requestSequence = {
    sequence: [
        [
            {
                request: getFileUploadToken,
                getRequestArg: () => () => ({ ...this.fileMeta }),
            },
        ],
        [
            {
                request: getFileUploadToken,
                getRequestArg: () => ([[token]]) => ({ ...this.fileMeta }),
            },
        ],
    ],
};
const requestSequence = {
    request: getFileUploadToken,
    getRequestArg: () => ({ ...this.fileMeta }),
    then: [
        {
            request: postFileUpload,
            getRequestArg: () => ({
                token: this.fileTokenRequest.data.getDataOr(null),
                file: this.fileToUpload,
                ...fileUploadMeta,
            }),
        }
    ]
};
```



## Arbitrary Arity on the Same Single-Arity Request

Sometimes you just need to GET 3 separate resources, but all at once.  That is, mapping an array of params to an array of requests.


### Simple Solution: Imperative Sequential Style

The simplest way, albeit also the most manual way, is just to use that `RequestProcessBinding` idea from above:

```js
new RequestProcessBinding(this, async (_, ctx) => {
    const messageIds = this.messageIds;

    return Promise.all(messageIds.map(
        id => ctx.dispatchThenGetDataOrThrow(getMessageDetails({ id }))
    ));
});
```

Simple and to the point, and we still get the caching benefits underlying the Requests Module.  Maybe that's all we need?


### More Automatic: Request Binding But With Arrays

For simple queries, we don't really need anything like the above.  Instead, we can just return an array of requests:

```js
new MultiRequestBinding(this, () => {
    return this.messageIds.map(id => getMessageDetails({ id }))
});
```

There arises the question of how that crosses with the various versions of `RequestBinding` itself, supposing we made separate `AutoRequestBinding` and other such versions.

The whole reason for things like `AutoRequestBinding` is that, for many requests, we don't actually care about when they're made, just that they're made.

This is usually for things like route params and such.  Search requests, too, but those are usually handled a little differently.

Thinking about it, it'd be nice if we had a key.

```js
new MultiRequestBinding(this, () => {
    return this.messageIds.map(id => ({
        id,
        request: getMessageDetails({ id })
    }));
});

// Or maybe just tuples/entries?

new MultiRequestBinding(this, () => {
    return this.messageIds.map(id => [id, getMessageDetails({ id })]);
});
```



## Aside: Do All Requests Need to be Persistent?  Culling Unneeded Data

One of the reasons the Requests module is written the way it is is so that it can field multiple requests for the same data.

But, what if some request isn't really needed across multiple different components?

This is most frequently the case with mutation requests: we don't usually need to keep that data except for locally in a given component's context because unlike a query request the response data is usually not meaningful outside of a very limited context.

That context is almost always that page component.

The way the Requests Module operates, it's far easier to leave data around than to eagerly clean it up.  Could we change that, though?


### Thought: Tracking Who Still Needs the Data, Clear It When No One Does

I think what would solve this is to build in the notion of "subscriptions" or at least "observers".  Not like full blown Reactive Programming Observers, but rather just keeping track of a list of who all is "observing" some datum, or rather who all "needs" some datum.

That is, we would create a mechanism to globally add and remove "needers" to a given key of some sort, then perform an action when ever a given key's "needers" all go away.

Specifically here, "needers" would be Components that would add themselves on dispatching a given request then remove themselves in the "before remove" hook; and the "all removed" action would be to reset the given request.

Because `RequestProcessBinding` passes in the methods to use, it can setup such tracking on each of those requests by just intercepting the calls to each requests module method wrapper (usually just `dispatchThenGetDataOrThrow`).

The "needers" tracker itself can be an entirely separate module, no need to complect that directly with the Requests module.


### Should Commands Be Automatically Culled On Component Removal?

As noted, Processes generally don't need their request state to be persisted, but what about Commands more generally?  Just because they're a single request doesn't mean they need to have their request state cached.  In fact, as with processes above, usually the first thing that happens in a component is their prior state is cleared.

> This could also be done when the request itself is completed, and the request state is just retained in local state rather than in global state.

So perhaps we should just pre-complect that behavior onto whatever we end up calling this particular bundle, like `CommandRequestBinding` or something.

On the other hand, `AutoQueryRequestBinding` would probably want to keep the caching.

I suppose then that that is a general difference: Queries usually want to cache, because they may be used by multiple components, but Commands usually don't want to cache because there's just not much reason to.

`AutoQueryRequestBinding` would then add on the automatic behavior on top of `QueryRequestBinding`, which would differ in that it assumes by default requests should all be cached while `CommandRequestBinding` defaults to requests being cleared.

I guess that would make `MultiRequestBinding` into `MultiQueryRequestBinding`, along with the added `Auto` variant.
