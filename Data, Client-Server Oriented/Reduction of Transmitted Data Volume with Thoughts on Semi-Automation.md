Reduction of Transmitted Data Volume with Thoughts on Semi-Automation
=====================================================================

Some immediate thoughts:
- GraphQL already does this.  If your shop can use GraphQL then by all means do that.
- Otherwise, reimplemented it halfassedly using standard RESTish stuff.
- For JSON responses, [always use an outer-object envelope](https://www.owasp.org/index.php/AJAX_Security_Cheat_Sheet#Always_return_JSON_with_an_Object_on_the_outside).  A few extra characters is a small cost to close a security hole.

Summary:
- [Endpoints should include some way of specifing what properties need to be included](https://www.vinaysahni.com/best-practices-for-a-pragmatic-restful-api#limiting-fields).

Implementation Ideas:
- Specific query params.
- Additional headers.

### Using Additional Headers

The header method has some very nice arguments for it:
- Declutters the query params.
- Declutters the response.
- Entirely optional, unless you require it of course by, say, sending only the props specified, and sending none if none are specified.

Possible issues with using the header method:
- Even headers have size limits.
- Do have to make sure any proxies pass them through.

Other notes:
- Don't go overboard and stuff all your parametrization into the headers.
  - Things like pagination params, filter params, those should still be in the query params, as they describe which data you're getting, not the shape of it.
  - Sending the request with the query params and without the custom header should (ideally) return a sane default.  Maybe just all properties.
- For sending pagination data back to the client, there's [RFC 5988: the Link Header](http://tools.ietf.org/html/rfc5988#page-6) for some basic info, but another header is still required for things like Total Result Count.
