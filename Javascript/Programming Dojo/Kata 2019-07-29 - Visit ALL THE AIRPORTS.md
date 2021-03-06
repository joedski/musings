Kata 2019-07-29 - Visit ALL THE AIRPORTS
========

> Given an unordered list of flights taken by someone, each represented as (origin, destination) pairs, and a starting airport, compute the person's itinerary. If no such itinerary exists, return null. If there are multiple possible itineraries, return the lexicographically smallest one. All flights must be used in the itinerary.
>
> For example, given the list of flights `[('SFO', 'HKO'), ('YYZ', 'SFO'), ('YUL', 'YYZ'), ('HKO', 'ORD')]` and starting airport `'YUL'`, you should return the list `['YUL', 'YYZ', 'SFO', 'HKO', 'ORD']`.
>
> Given the list of flights `[('SFO', 'COM'), ('COM', 'YYZ')]` and starting airport `'COM'`, you should return null.
>
> Given the list of flights `[('A', 'B'), ('A', 'C'), ('B', 'C'), ('C', 'A')]` and starting airport `'A'`, you should return the list `['A', 'B', 'C', 'A', 'C']` even though `['A', 'C', 'A', 'B', 'C']` is also a valid itinerary. However, the first one is lexicographically smaller.

So, basically, given the directed-edges of a directed possibly-cyclic graph, and a designated source node, find the lexicographically-smallest traversal across all edges, if one exists.



## Thinking It Through

Pretty sure this already exists somewhere as an algorithm, and that there's a name for it.  First, though, I wanna try do devise a concrete solution myself.

First thing to note is that the "lexicographically smallest" stipulation is really the least important thing: it's only there to ensure a single unique answer.  The "Traverse all edges or die, starting at given source node" thing is really the meat of the problem.

I think something like this will work:

- Topo sort, starting at designated source
    - Not sure if necessary, but it may make it easier by ensuring all subsequent edges are "later" than preceding edges.
- Trial combinations, reduce to only complete traversals
- Pick lexicographically smallest

How to prevent memory/run-time explosion?

- Do a depth-first visitation so that we only check one traversal at a time
    - We still have to keep state for each node in our current traversal, but we don't have to compute all the next-nodes for every single traversal all at once.
    - Once we move on to the next one we can completely discard any generated state below the given node, saving only the results (ordered node-list or null).
        - Thus, the number of per-node states in memory is at most the number of nodes.

Okay, so over all pretty simple once you look at it like that.


### A Second Look

After devising that, I think the topo sort isn't really necessary, it doesn't really gain anything other than to say that I know about topo-sorts.  The only important thing is where we start and not visiting edges we've already visited.  It might make getting subsequent lists mildly more efficient, but that means it's an optimization that may or may not help, not a necessity.

State wise, then, we'll have the following for each Node:

- Next-Edges remaining to Traverse. (Set<Edge>)
- Edges Already Traversed. (Set<Edge>)
- Successful Full Traversals. (Set<List<Node>>)
    - Meaning "Reached a Node where all Edges are in the Edges Already Traversed set".

Where here a Successful Full Traversal means "Reached a Node where all Edges are in the Edges Already Traversed set".


### Algorithm Outline

- Given:
    - Itinerary (Set<(Node, Node)>)
    - Source (Node)
    - Already Traversed (Set<(Node, Node)>)
        - Default value is the empty set.
- Are Itinerary and Already Traversed are the same set-wise?
    - If Yes, return status "Successful Full Traversals" with the Successful Full Traversals (Set<List<Node>>) as a Set of a single List of just the current Node itself.
    - Else, continue.
- Create Next Traversals (Set<(Node, Node)>) as those elements of Itinerary where the first sub-element is the Source.
- Create Current Successful Traversals (Set<List<Node>>) as an empty set.
- Are there any Next Traversals?
    - If No, return status "Unable to Fully Traverse".
        - NOTE: Because we've already determined that there are remaining edges (that is we exited early if there were no remaining edges which is the same as saying we're visiting the Last Node) if we can't actually traverse any of those edges from this node then we can't build a full itinerary as per the requirements.
    - If Yes, continue.
- For each Next Traversal in Next Traversals:
    - Visit the Next Node:
        - With:
            - Next Already Traversed as Already Traversed with Next Traversal added
            - Next Source as the next Node in the Next Traversal
        - Apply this algorithm with the given Itinerary, the Next Source, and the Next Already Traversed.
        - Did the algorithm return with the status "Successful Full Traversals"?
            - If Yes, for each Node Visitation List in the Successful Full Traversals:
                - Create a new Node Visitation List with the Current Node prepended.
                - Add that new Node Visitation List to Current Successful Traversals.
            - If No, discard that result and continue ot the next Next Traversal.
- Are there any Current Successful Traversals?
    - If Yes, return status "Successful Full Traversal" with the Current Successful Traversals for the Successful Full Traversals.
    - Otherwise: return status "Unable to Fully Traverse".

By running this algorithm on the given Source Node, we can get a Set of Full Traversals.  From there, we can sort them lexicographically and pick the smallest one, giving us our unique answer.  Of course, if we ultimately end up with a status of "Unable to Fully Traverse", our answer is "No Answer".



## Implementation 1: Recursion

The naive approach is simply to recur, effectively making the stack our per-node state.  For the most part, this shouldn't break the bank, but if you're concerned about efficiency it _tends_ to have more overhead than just managing a minimal stack yourself.  Of course, on the other hand, managing the stack yourself means more developer overhead, but may be more efficient machine wise.  Maybe.


### Implementation 1: Recursion: Digression

As hinted to in the coda of the algorithm outline above, we actually have two parts going on here:

- Running the Algorithm itself
- Picking the Lexicographically-Smallest list, if any

Given that there's meant to be 1 and only 1 unique answer (duplicates are the same and so extra duplicates are discarded in Sets) this means we can just pare down all results to only the Lexicographically-Smallest at each step.

The result is this:

- Since each next-traversal returns 1 and only 1 result, we only need to compare 1 result from each successful next-traversal.
- Since each next-traversal is a traversal to a _different_ Node, we only need to compare the Next Node to determine the lexicographically smallest, because deeper results already pared their result-spaces down to just 1 result that was locally lexiographically-smallest.
- We only need to compare two results at a time, because 1 and only 1 is the smallest.  Ergo, we can just use a reducer.

Effectively, the second step is folded into the algorithm itself.  This could even be extracted into a parameter (or dependency injection if you like that term better) for maximum flexibility in dealing with results.  It's just a reducer, after all.


### Implemention 1: Recursion: Actually Implementing It

Moving to concrete land, we'll need to define just how to represent the result states in JS.

We know after all the above that we have basically only the two result states noted in the beginning:

- Success: A single, lexicographically-smallest sequence of nodes.
- Failure: A null.

And we can reduce everything down to those across all next-nodes by just performing the lexicographical reduction at each step before returning the result, negating any need to ever return n>1 results.

Another thing we can eliminate is the Set Already Traversed, which is really only used to determine the pool of next traversals to try.  By eagerly performing the set subtraction and calling the next iteration on that, we get the same effect as before.

The result isn't that big, so I added a bunch of comments to puff up the linecount.

- Allocations:
    - 1 Array for Next Traversal Candidates.
    - Maybe 1 Array for the return value, only in Success cases.
    - 1 Array and 1 Set per Next Traversal Candidate.
    - 1 more Array for the `.map()` call.
    - 2 Functions, 1 for the `.map()` call, 1 for the `.reduce()` call.
- Calls:
    - `completeTraversalOf` itself gets called for each Next Traversal Candidate.  This is how state is tracked, basically.
        - The stack should only grow to about 3 or so times the deepest traversal, which in the worst case would be N + 1 where N is the number of edges in the originally supplied itinerary.
            - The 3 functions are `completeTraversalOf()`, `Array#map()`, and the function passed to `Array#map()`.
- Thoughts:
    - The function allocations could be eliminated by just defining them elsewhere: they're pure, and they don't reference anything in a parent scope.
        - Though, for all I know, V8 may already do that.
    - You could completely extract result handling by combining the conditional-source-node-prepend with the reduce operation.  Or, you could always return a List or Set of results and just always iterate them afterwards to prepend to whatever's there, but eh.  Many ways to do that.
    - You could probably also abstract this into an operation on any set of edges in a graph, use a library of graph operations, yada yada.  Only useful if you're actually doing a lot of different graph operations, or a non-trivial traversal, though.  Otherwise, dunno if there's much immediate value to that.

```js
/**
 * Get the lexicographically-smallest complete traversal
 * of a given set of directed edges, where "complete" here
 * means that every edge in the set is traversed.
 * @return {string[] | null} An array of nodes in the order traversed,
 *                           or null if no complete traversal is found.
 */
function completeTraversalOf(
  /**
   * Set of potential traversals.
   * @type {Set<[string, string]>}
   */
  itinerary,
  /**
   * What node we're starting our traversal at.
   * @type {string}
   */
  source
) {
  // Case 1: We've alredy traversed everything.
  // If there's no more traversal candidates, we've reached an end point.
  // Success!
  if (itinerary.size === 0) return [source];

  const nextTraversalCandidates =
    [...itinerary].filter(edge => edge[0] === source);

  // Case 2: No candidates for traversal.
  // We know there are edges remaining to traverse, we can't proceed
  // from the given source.
  // No dice, here.
  if (nextTraversalCandidates.length === 0) return null;

  // The meat of the matter.
  // It's a lot shorter than the outline might suggest.
  const nextCompleteTraversal = nextTraversalCandidates
    .map(edge => {
      const nextSource = edge[1];
      const nextItinerary = new Set(
        [...itinerary].filter(nextEdge => nextEdge !== edge)
      );
      return completeTraversalOf(nextItinerary, nextSource);
    })
    // Reduce results to just the lexicographically smallest one.
    // The implementation could be trivially made paramtrizable
    // to allow for different sorting, like having
    // lexicographically-largest or something.
    .reduce(
      (acc, next) => {
        if (! acc) return next;
        if (! next) return acc;

        // We only need to check the first node because every level
        // of recursion already checks the next node of its own result.
        if (acc[0] > next[0]) return next;

        // It could be the same if we allow multiple edges to be the same,
        // that is a node is connected to another node by multiple
        // identical edges.  The problem statement didn't preclude this
        // possibility, so it could happen...!
        return acc;
      },
      null
    );

  // Case 3: None of the next-traversals lead to a complete traversal.
  // No dice here, either.
  if (nextCompleteTraversal == null) return nextCompleteTraversal;

  // Case 4: Now that we've got the lexicographically smallest,
  // append the current source node and kick it up.
  return [source, ...nextCompleteTraversal];
}
```
