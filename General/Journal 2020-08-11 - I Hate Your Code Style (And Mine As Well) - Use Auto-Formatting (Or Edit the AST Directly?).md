Journal 2020-08-11 - I Hate Your Code Style (And Mine As Well) - Use Auto-Formatting (Or Edit the AST Directly?)
========

Spaces vs Tabs?  Cuddled or socially distanced braces?

I stopped caring awhile back because I discovered the joy dogmatic auto-formatting in the pre-commit hook.  Now, as long as I can install project dependencies I can also use any editor I want, be as lazy as I want, and the code that gets committed will be nice and tidy.

Can we go further, though?

There was [an SO answer somewhere](https://softwareengineering.stackexchange.com/a/118508/347452) that really spoke to me, whose answer was "Just edit the AST".

This is both the platonic ideal of coding, but also really annoying when it comes to using existing source control tools and really existing anything because everything is essentially text based.  For good reason, too, since text (now UTF-8) is the lowest common denominator: anything can read it and process it, even if it can't do anything meaningful with it, and of course it's imminently understandable by humans.

What would be the next step, then?  Or at least an intermediate step?

Maybe a process that went like this:

- 5 millenia ago on the disk, the file existed.
- The editor then opened the file, translating from its style to the user's perferred style.
- The user, having made some edits, then saved the file and the editor translated it back to the project's style.
- And everyone stopped caring about code style because they could use what was readable to them, what they'd trained their brain to scan the quickest.

Editing the AST directly would work something like that, really, except that the "translating back to the project's style" step would really be just updating the saved AST.

[Someone did ask a question about why we don't just edit ASTs directly](https://softwareengineering.stackexchange.com/questions/119095/why-dont-we-store-the-syntax-tree-instead-of-the-source-code?noredirect=1&lq=1), though they seemed to indicate wanting to translate between programming languages, something which I don't think is practical nor desired, a conclusion affirmed in many answers.  I do, however, think that [the reference](https://softwareengineering.stackexchange.com/a/119286/347452) to [JetBrains MPS](http://www.jetbrains.com/mps/) is interesting, in that they do have "projections of the DSL", which is basically what I'm talking about above.  So, someone's been doing this at least.

[Another answer](https://softwareengineering.stackexchange.com/a/245483/347452) points out that Lisps are already ASTs, though with varying degrees of syntactic sugar on top.

That does point out another issue, though: putting aside that some languages (cough C++ cough) are `Interesting` to parse, you've just created another format/representation of the code, which is of course the AST.  In a recent example, the AST that TypeScript emitted was incompatible with the AST Babel JS emitted, due to going different paths, which necessitated translation tooling.  So, which AST is considered canonical?

The crass answer I suppose is just the textual representation, which punts things back to formatting.

I do think every language should come with something like `prettier`, a command line utility which shoves everything into a fixed formatting style, excepting those blocks which are opted out. (Opt outs should be included for specific semantic needs)  Being able to apply lint fixes as well, such as ordering imports, would be good.
