Journal 2019-06-24 - Code Organization by Utility vs Integration (Generalization vs Specialization)
=========

As I've been thinking about it, one dimension that code should be organized by is on what I'll call here the Utility vs Integration dimension.

> There might be a more generally accepted name for this, and I'll try to remember to update this if I find out.

> This is not to be confused with the concept of Functional Core, Imperative Shell, though in my opinion separating Utilities from Integrations greatly helps with following the Functional Core, Imperative Shell methodology.

To summarize:

- Utilities or Generalizations are units of code that are general in some sense, either to the given Business Domain, or more generally across the given Application Architecture Domain.
    - One could think of Utilities as units of code that could be copy/pasted between code bases whose domains intersect.
    - They are the DRYing of your Repetitions, if you will.
- Integrations or Specializations on the other hand are pieces of code that tie together and/or specialize one or more Utilities to achieve a single specific effect or end goal.
    - In contrast to Utilities, there's usually very little value to copy/pasting Integrations between code bases.
    - They are the parts you cannot DRY.

For a more modular code base, then, one should strive to separate as much code out into orthogonal Utilities as possible.

Other Definitions:

- Business Domain, Application Domain
    - In general, when I talk about a Domain, I mean the conceptual space that some portion of code targets or operates in.
    - Business Domain code deals with concepts and concerns that have to do with Business Logic, modeling Business Entities, that sort of thing.
    - Application Domain code then deals with concepts and concerns that have to deal with Application Logic, usually including things like View Models, Rendering, UI Event Binding, all the Modeling and Internal State Management necessary to actually operate those things, and so on.



## On Utilities/Generalizations

Utilities/Generalizations tend to have these qualities:

- They tend to be units of code that could be copy/pasted somewhat easily between codebases whose domains intersect.
    - Some units may be so generic that they really fall into generic tool-belt code.
        - An example of a collection of such units is a JS library like Lodash or Underscore.
- They can frequently be thought of as DRYings of your codebase.
- They tend to not have much to do with actually bootstrapping the application; rather they tend to be used by and parametrized by the Integration/Specialization code.
- They tend to be much more amenable to Unit Testing than Integrations/Specializations.
- As part of that, they tend to either not have hard dependencies on other Utilities/Generalizations except for those which are yet more generic than themselves, or they tend to have a lot of dependency injection or dependency-by-parametrization, which I myself consider the same thing.



## On Integrations/Specialization

The most important Integration/Specialization is the Entry Point, the Application Initialization code.  This is the root-most Integration Point in the Application.

After that, most of the Integration/Specialization code in an App is usually the various Views in User-Facing Apps, or Endpoints in API Apps.  In some architectures, the base unit of Integration/Specialization is the Controller, or its Methods; where in others the base unit may be some View-Model/Controller Combo Component.  In any case, there tend to be these qualities:

- They tend to not have much value to copy/paste between code bases.
    - Any such code is usually also used multiple times through out the Application, and so is usually also shunted into the Utility/Generalization section of the code base.
- They tend to be the what's left after DRYing everything else, the parts that themselves cannot be DRYed.
    - They're the specific parts of the application code, the parts that actually deal with User Stories as opposed to the supporting Utilities/Generalizations.
    - They're coordinating glue that takes those supporting Utilities/Generalizations and builds them up into the specific thing, whatever that thing is.
- Dependency Injection if done at all tends to rely on more complicated or comprehensive mechanisms such as Spring Autowiring or other Container type things.
    - And there's always the Root-Most Integration Point, the Entry Point, which still has to actually parametrize such Dependency Injections.  It's got to be done somewhere!  Hopefully it's at the entry point!
