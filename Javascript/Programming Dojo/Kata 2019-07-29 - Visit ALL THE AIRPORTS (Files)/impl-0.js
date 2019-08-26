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

module.exports = completeTraversalOf;
