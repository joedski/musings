Journal 2019-11-08 - Keyed Requests and Ergonomic Usage
========

I like the current way the Keyed Requests code is setup, but it is getting kind of boilerplaty.

To wit, current usage in a component involves defining a few things:

- The Request Creator
- Any Params Getters used by the Request Creator
- Data Getter associated with the Request Creator

For instance, suppose I have a request that requires an Application ID: I need at minimum 3 things:

```js
export default Vue.extend({
  computed: {
    applicationId() {
      return finiteNumberOr(this.$route.params.applicationId, null);
    },

    applicationDetailsRequest() {
      if (this.applicationId != null) {
        return getApplicationDetails({ applicationId: this.applicationId });
      }
      return null;
    },

    applicationDetailsData() {
      return readRequestDataOrIfNull(
        this.$store,
        this.applicationDetailsRequest,
        AsyncData.Error(new Error('Missing Request Parameters'))
      );
    },
  },

  mounted() {
    dispatchRequestIfNotNull(this.$store, this.applicationDetailsRequest);
  }
});
```

I wonder if there is a more ergonomic way to do things?



## Binding Object?

```js
export default Vue.extend({
  computed: {
    applicationId() {
      return finiteNumberOr(this.$route.params.applicationId, null);
    },

    applicationDetailsRequestBinding() {
      return new RequestBinding(this.$store, () => {
        if (this.applicationId != null) {
          return getApplicationDetails({ applicationId: this.applicationId });
        }
        return null;
      });
    },
  },

  mounted() {
    this.applicationDetailsRequestBinding.dispatchIfNotNull();

    // example of reading data.
    console.log(this.applicationDetailsRequestBinding.readDataOrIfNull(
      AsyncData.Error(new Error('Missing Request Parameters'))
    ));
  },
});
```

That doesn't seem to save much, and honestly isn't even the most annoying part, but it's a mild improvement.


### With Some Sort Of Parameter Checker?

Another annoying part is the whole parameter checking thing: we need to assert that some parameters are not some unacceptable value (usually null/undefined) before we can create the request.

Maybe there's a way to make that whole thing less annoying?

```js
export default Vue.extend({
  computed: {
    applicationId() {
      return finiteNumberOr(this.$route.params.applicationId, null);
    },

    applicationDetailsRequestBinding() {
      return new RequestBinding(this.$store, () =>
        requestIfParamsNotNull(
          getApplicationDetails,
          { applicationId: this.applicationId }
        )
      );
    },
  },

  mounted() {
    this.applicationDetailsRequestBinding.dispatchIfNotNull();

    // example of reading data.
    console.log(this.applicationDetailsRequestBinding.readDataOrIfNull(
      AsyncData.Error(new Error('Missing Request Parameters'))
    ));
  },
});
```

Where it takes 2 to 3 arguments:

1. Request Config Creator function.
2. Params object whose own-keys must be non-nullish.
3. Optional Params object whose own-keys may be nullish.

Kind of annoying in that it separates required from non-required, but that's the only way I can think of to do it without adding extra validation somewhere.

Though, I suppose with codegen, we could actually make the request creators themselves return null if not all of the required parameters are present.  Hmmm.
