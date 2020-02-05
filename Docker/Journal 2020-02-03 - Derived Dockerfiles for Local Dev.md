Journal 2020-02-03 - Derived Dockerfiles for Local Dev
==========

Basically, I want to reuse the deployment Dockerfile because it actually is mostly what we want, I just also want to add an extra thing when testing dist compilation artifacts locally.

My first thought was abusing `FROM` but that only works on images.  But if it works on images, and Docker is all about building images... can't we just create a local image and start `FROM` that?

How about looking at `docker build --help`?

It looks like we'd start with the usual, just `docker build .`, but where to go after that?

One option that seems to stand out, `--iidfile`, which has the following description: "Write the image ID to the file".  That's one option, because the image ID is just a hex string, and not user controlled.

Another mmmmaybe, `--tag`.  `--tag my-project:local-test`?

Those are the first two that seem promising.  I'd have to look up any others.



## Aside: Corporate Proxies

I started tracking that here but it blew up so I [moved it elsewhere](./Journal%202020-02-03%20-%20Docker%2C%20npm%2C%20git%2C%20and%20Corporate%20Proxies.md).
