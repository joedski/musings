Journal 2021-05-21 - On Projection Queries vs Composing Entities in Aggregates and Projection Objects
===========

In one project, we initially eagerly created and returned projections from a number of our repository methods.  I'm starting to think this was wrong.

So, why projections in the first place?

Well, first off, they _can_ be quite efficient as, after all, you only fetch exactly the columns you need, and no more.  The larger your queries, the greater the benefit of this.

In counter, one might be wise to ask if you really need to fetch all those rows in the first place?

What sort of issues does this lead to, though?

- Since each Projection is itself a bespoke entity, once you've gotten it from the DB you're kinda stuck with it.
- Because you no longer have the original Entities used to create the Projection, adding new dervied fields to the Projection is painful:
    - You have to update each query returning the projection to add that new field, in the exact location in the constructor args order.
    - This must be done in the queries rather than referencing already-fetched entities.


