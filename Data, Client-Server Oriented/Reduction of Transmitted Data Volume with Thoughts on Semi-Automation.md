Reduction of Transmitted Data Volume with Thoughts on Semi-Automation
=====================================================================

Some immediate thoughts:
- GraphQL already does this.  If your shop can use GraphQL then by all means do that.
- Otherwise, reimplemented it halfassedly using standard RESTish stuff.

Summary:
- Endpoints should include some way of specifing what properties need to be included.

Implementation Ideas:
- Specific query params.
- Additional header.

The header method has some very nice arguments for it:
- Declutters the query params.
- Entirely optional, unless you require it of course.
