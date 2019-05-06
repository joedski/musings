Journal 2019-05-05 - mDNS Query Support in NodeMCU Lua
========

There's a maintained library for running an mDNS server, but not making queries...

I [forked an existing client lib](https://github.com/joedski/nodemcu-mdns-client) so I could tweak it (and have a repo to track changes) while I [work on a PoC](https://github.com/joedski/nodemcu-mdns-client-test), but so far it's not quite working.

I don't seem to get any actual results back and every so often it crashes with `PANIC: unprotected error in call to Lua API (mdnsclient.lua:228: unknown error)`.  The exact line is this: `s:send(mdns_port, mdns_multicast_ip, mdns_make_query(ptr))`.  It's in a for loop, though, so I wonder if it's spamming `s:send` too much?

[The docs](https://nodemcu.readthedocs.io/en/master/modules/net/) say this on that topic:

> Multiple consecutive send() calls aren't guaranteed to work (and often don't) as network requests are treated as separate tasks by the SDK. Instead, subscribe to the "sent" event on the socket and send additional data (or close) in that callback. See [#730](https://github.com/nodemcu/nodemcu-firmware/issues/730#issuecomment-154241161) for details.

It seems that [the API used to buffer `sck:send` calls, but no longer does](https://github.com/nodemcu/nodemcu-firmware/issues/730#issuecomment-154285911).  Guess I'll have to fix that in my fork.

I guess the first thing to do is to rewrite the query part so that it only sends one request at a time.  Maybe make a send-marshaller thingy?  Hm.
