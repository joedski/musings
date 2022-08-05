Journal 2021-09-27 - Inane Rambling on the Notion of VR Hypermedia Type for Restful Services
============================================================================================

There's no reason I can think of that we couldn't create a hypermedia type for consumption by a VR "browser" and have this fit within the constraints of the REST architectural style.

- All of the visual assets and associated data are emminantly cacheable.  It's like CSS and images, just shaders and textures and models.
- The data-and-relations-first requirements of REST's hypermedia requirements put relational-links front and center.
- For large public spaces, things will be by and large the same.  Some clients may have requests that result in greater or lesser amounts of data, but still.
- The "pages" of the public area are 2 or 3 dimensional rather than 1 dimensional.
    - And you can of course have any number of other paths linked by the index, to form the other spaces in the given site/world.
- The "index" of the VR site is just the landing area, something which all VR spaces must define anyway.
- Bookmarks still work as well.

Conclusion: You can RESTfully serve a VR experience.  Whether it'd be ideal or not is another question, but it would at least put front-and-center the relational-linking of everything, which is the most important part.

Would you want to serve this over HTTP?  I mean, you could, but whether you'd want to do that or whether you'd want to use a different transport altogether is another matter.  Certainly, you'd want at minimum HTTP 2 since HTTP 1 would unnecessarily bottleneck everything.

But then, maybe we should support older or less resource-rich clients?
