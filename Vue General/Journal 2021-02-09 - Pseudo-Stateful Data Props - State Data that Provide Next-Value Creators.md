Journal 2021-02-09 - Pseudo-Stateful Data Props - State Data that Provide Next-Value Creators
========

I'm not sure where all this would be useful, but it might be in something like Pagination where you'd like to deduplicate common logic such as computing the next value.

- Vue docs explicitly state that the prototype of an object, and by extension anything deeper within, is ignored.  This means any default properties, including methods.
- Data that updates its own state is discouraged, but we can still provide methods if we so choose.
- If we provide the methods, we still leave to the controlling component just what updates to use.

Suppose we do something like this, then:

```js
// NOTE: Assuming 1-based page indexing.

class PaginationState {
  constructor({ page = null, perPage = null, totalItems = null } = {}) {
    this.page = page;
    this.perPage = perPage;
    this.totalItems = totalItems;

    // Expose directly.
    this.totalPages = this.computeTotalPages();
  }

  computeTotalPages() {
    if (this.totalItems == null || this.perPage == null) return null;

    if (this.totalItems === 0) return 1;

    return Math.ceil(this.totalItems / this.perPage);
  }

  // State Transitions
  //////////////////////

  nextPage() {
    const next = Math.min(this.totalPages, this.page + 1);

    return new PaginationState({
      page: next,
      perPage: this.perPage,
      totalItems: this.totalItems,
      totalPages: this.totalPages,
    });
  }

  prevPage() {
    const next = Math.max(1, this.page - 1);

    return new PaginationState({
      page: next,
      perPage: this.perPage,
      totalItems: this.totalItems,
      totalPages: this.totalPages,
    });
  }
}
```

Then, in a parent we might say:

```js
export default {
  methods: {
    nextPage() {
      this.fooTablePagination = this.fooTablePagination.nextPage();
    },
  },
};
```

Or, if we're in a stateless component, we might instead say:

```js
export default {
  methods: {
    nextPage() {
      this.$emit('update:pagination', this.pagination.nextPage());
    },
  },
};
```

That seems like a small thing, but it means no one has to remember to limit prev/next page calculations because that limitation is baked into the method.
