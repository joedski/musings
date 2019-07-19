---
tags:
    - openapi
    - codegen
    - typescript
summary: >-
    Dev journal for my first time doing codegen from a swaggerdoc for requests in a UI project.
    It's not hard per se, I just need some place to keep my thoughts while doing it.
---

Journal 2019-07-18 - OpenAPI (Swagger) Codegen - Client Request Definitions
========

> NOTE: I use "Swaggerdoc" and "OpenAPI Doc" interchangeably here.

Initial thoughts:

- Have a script to download the swaggerdoc from any APIs we're targeting and generate code for the client:
    - Requset Definitions
    - Payload Validation
    - Types of Parameters and Payloads
- Template or programmable customization.
    - After all, projects are going to differ, slightly or significantly, in how they structure their requests.  This is especially the case for projects with any amount of legacy code.

Not sure if it will be much more complex than "Download doc, iterate endpoints, write using specified module or template".  Or, rather, hopefully it won't be more complex than that.  Again, simplicity/obviousness is its own reward.

> Okay, there's one complication that immediately comes to mind: We have SSO at our organization and our API's own swaggerdoc is behind authentication, so first I'll have to figure _that_ out.  I should probably make that a separate journal just because it's not actually related to the codegen thing here.
