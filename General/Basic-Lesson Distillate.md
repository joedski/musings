Basic Lessons Learned from Working On PWAs
==========================================

## General Lessons

- Minimize Complexion
  - I mean, obviously, right?
  - Don't build hard-coded combinations of functionality where they're not necessary.  That only serves to obscure what's going on.
  - Where something can be implemented in a few separate orthogonal functions and from those combined into the desired total functionality, it should be.
- Make your code readable
  - You spend significantly more time reading your code than you do writing it.
  - Give meaningful names to things.
  - If necessary, leave comments, especially when hacking around things you can't change such as other peoples' APIs.
- Dogmatism in Moderation
  - Far better to ship and be aware of the cost than to miss out.
  - You did file some Tech Debt issues in the tracker, didn't you?
- Pragmatism in Moderation
  - Building things as pure functional utilities can be slow to start, but proper separation of concerns will always pay off in the long run.
- Write Shit Down
  - Just Do This.
  - Planning something out?  Write it down.
  - Ran into a bug?  Write it down.
  - Had an idea?  Write it down.
  - Discovered some new way to refactor things better?  Write it down.
  - If it's not written, it's forgotten.
- Never Stop Learning
  - To stop learning is to start stagnating.
  - Also, learn by doing.
- Take Breaks
  - Sometimes you need to space out, and let your mind go to baseline.
  - This is necessary for digestion of thoughts, and is especially important while learning, which you should never stop doing.
  - Even better, do something manual that doesn't require much _conscious_ thinking.
- If You Have the Time, Do It Right
  - As best as you can _at this point in time_; see also next point.
- Decide and Commit
  - Don't spend all your time in perpetual planning.
  - If it's a large problem, start small explorations into it, they will help inform your remaining decisions.  You can't preplan everything, especially if there are many unknowns.
- Use Source Control
  - Git?  SVN?  Mercurial?  Perforce?  Pick one and use it.
  - Maybe not CVS, though.  Especially not if it's the drug store.



## (Somewhat) More Pointed Lessons

- Don't be clever with your state.
  - You want to make your state as blunt as possible.  Who are you even trying to impress?
- Don't hide things from yourself.
  - For instance, if your app is a Universal App, then be up front about that in your state.  Don't make it difficult to determine what side of the client/server divide you're on.
  - Who are you protecting yourself from by obscuring such state, anyway?  Yourself?
- If you normalize, then normalize, absolutely, always.
  - Partial normalization only makes things weirder later on.
  - For instance, if a Logged In User is only different from a User by dint of having extra stuff, pull the extra stuff off and stick it in the the Logged In User slice/module, with an ID pointing to the common User entity.
    - You can denormalize in a cached selector if you really need to, however, see below for thoughts on that.
- Request Caching and Deduplication is a Separate Concern from Component Value Injection
  - Anything which does those two concerns together should first implement them separately.  If they cannot be implemented separately and combined, then you need to refactor.
  - Similarly, Response Normalization and Transformation should again be separate, orthogonal layers, applied separably.
- Pagination Handling should be Opt In
  - Include the necessary values and machinery to do it, but don't force it on everything.
  - Also, like the previous item, it should be a separable orthogonal piece.
- Create Derived Entities as close to point of use as possible
  - Particularly with Redux, don't make Populated Entity Creators at the top level; make those only if a component needs them.  Better yet, don't use them at all, stick purely to references.
- Response Normalization should be handled using a common Schema sent from the Server to the Client.
  - This is especially true if you describe your API using Swagger/OpenAPI: Every endpoint already describes what it takes in and outputs, you should be able to use this information without duplicating it on the client.
  - Or, alternatively, Responses Should Come Pre-Normalized From The Server.
    - Then you don't have to even include any normalization machinery on your client!  Woo hoo!
- Overnormalization means you may be doing something wrong
  - It's not that a lot of normalization is necessarily bad, but it is a sign you may want to investigate if you're either producing the correct data in the first place, or if you're using it correctly, or if you're even requesting the correct data.
    - Especially with APIs you don't control, you may sometimes have to gently massage the data in the same way that a baker gently massages dough.  But for APIs you do control, you may need to fix something on the back end.
- Schemas and Type Descriptions Are Good
  - Thinking about your data first is always good.
    - Even if you're prototyping, though you'd be forgiven for being a bit loose with it there.
  - It takes practice, though, so do it early, do it often.
- Unpopulated/Populated Dichotomies Should Be ~~Avoided~~ Handled With Care
  - The less you mangle/remangle your data, the better.
  - While a Populated Entity (one whose relations are reified and attached to itself) can be handy, it usually ends up being picked back apart by the various UI elements, meaning you've just undone the work you did moments ago.
    - Even worse, you've just added another layer of computation/caching to your data-view mapping.
  - Rather, a UI element should pull what it needs from the state.  If it shows the main properties on the entity, it should pull the entity.  If it shows a list of related other entities, it should use the entity's id to get its relations and pull those rather than pulling everything.
  - There's also another question: Where does the de-normalization end?  One relation deep?  Two?  Usually once is sufficient, but not bothering with de-normalization avoids this issue entirely.
  - All of this once again goes to one of the Golden Rules: Minimize Complexion.
- Pure Functions are Testable
  - Side effects, not as much.
- Never Copy/Paste What Can Be Refactored
- Write Specifically First, Abstract Later
  - Early Abstraction is a form of Early Optimization, and Early Optimization in the face of ignorance of the true Problem Domain is a Sin.
  - Most of a view in an app should start in the `views` dir, or whatever the Actual Rendered Views part is.
  - Then, if there are any parts that seem like they can be cleanly abstracted into separate orthogonal components, break them out into their own parts in the `components` dir and refactor the view to use them.
- `Array#map` (React) and `v-for` (Vue (and really Angular)) is superior to any pre-complected list + list-items component.
  - There's basically very little reason, even in specialized circumstances, to use a List component of some sort that iterates for you over a more basic machine such as `Array#map()` or `v-for/ng-for`.
  - A pre-complected list component obscures your output, especially the more features are added to it.
    - Further, adding all such features to one List component bloats it beyond all reason.
    - Instead break it into a bunch of small utility components that make it obvious what each one does and can be used with `Array#map()`/`v-for`.
  - There may very well be a reason at times to create a pre-complected List component, but it has to be very compelling to counteract the obscuring of actual output.
  - This is a specific example of using basic tools over over-fancy tools to leave code more readable rather than more compact, as that compactness comes at the cost of increased cognative burden.