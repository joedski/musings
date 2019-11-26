Journal 2019-11-13 - Querying the Backlog
==========

I want to setup an app on my Rally dashboard to make it actually useful to me, but I need to know how to query items in the backlog rather than from the current iteration.

Slight deficiency: have to select only one of the entity types.  Can't select both User Stories and Defects, for instance.



## Attempt 1: StartDate = null

> Summary: Success.

I don't know if this is something that can be acheived by just asking `(iteration.StartDate = null)` or not, but hopefully it's just that simple?

I'm using the core app named "Incomplete Stories for Current Iteration" which comes with this query as its default:

```
(
  ((iteration.StartDate <= TODAY) AND (Iteration.EndDate >= TODAY))
  AND
  (ScheduleState < "Completed")
)
```

Items in the backlog aren't going to be `"Completed"`, but I'm going to take that out anyway.

> Aside: Maybe I should also include the tag "Frontend" since that's what I'm concerned about mostly?  But then a frontend defect might not have been properly tagged.  Bah.

```
((iteration.StartDate = null) AND (ScheduleState < "Completed"))
```

From there, I just need to add the Rank column and sort by that, and it's golden.  Sweet.



## Aside: Current User Queries

I took a peek at the "My Defects" app and saw it's just another prefab of the Custom List:

```
((State < Closed) AND (Owner = {user}))
```

Interesting, you can reference the current user.  Good to know.

I think the thing I dislike the most about the Custom List app is that it limits you to one kind of work item.  I'd really like to select both Stories and Defects.
