Journal 2019-03-13 - STOMP and SockJS
=====================================

A work project is using STOMP (Simple Text Oriented Messaging Protocol) over SockJS.  Or trying to.  While some issues with AWS VPCs and logging get worked out, I'm going to play with the client side to get familiar with things.

To do this, though, I need to actually spin up a minimal server.

Exploration Goals:

- Setup a basic websocket server locally.
    - I'm thinking it'll just periodically echo back an object with the current logs tab settings and a random message.
- Learn how websocket stuff is meant to be handled, client side.
    - Before I go on a controller-creation rampage, I should learn how STOMP expects client side stuff to be handled, what sort of usage it was written with in mind.
- Contemplate client abstractions.
    - Once I've gotten some basic reading done on the topic, start to think about how to actually abstract usefully around it.

Sources:

1. [STOMPJS Usage][ss-1]
    1. As of 2019-03-13, kinda sparse.  Hopefully be better in the future.
2. [STOMPJS API Docs][ss-2]
    1. Useful, but only once I actually know what I'm doing.  No intended usage patterns are expressed here.
3. [STOMP Site][ss-3]
    1. Very bare bones site, but it does have a list of broker implementations.
        1. Sadly, no Broker implementations are listed for Node.
    2. [Changes in spec v1.2][ss-3-1]
4. Searching for STOMP Brokers in Node:
    1. [npm: stomp-broker-js][ss-4-1]
        1. As of 2019-03-13:
            1. Supports STOMP 1.1
            2. Lacks some features, such as Authorization, Acks, Transactions, Message Selectors, some others.
            3. Last NPM publish was a year ago, though the last GH merge to master was in January.
            4. Seems to include SockJS as an adaptor, but that's not in the published artifact in npm.
        2. [Master branch as of 2019-03-13][ss-4-1-2]
            1. [SockJS Example][ss-4-1-2-1]
    2. [npm: stomp-protocol][ss-4-2]
        1. As of 2019-03-13:
            1. Doesn't support full broker type stuff, but could be useful for at least toying with things?
5. [SockJS GitHub Org][ss-5]
    1. [SockJS Node Server][ss-5-1]
    2. [SockJS Example: Multiplexer][ss-5-2]
6. [Websocket-Multiplex][ss-6]: Multiplex over a single SockJS connection

[ss-1]: https://stomp-js.github.io/
[ss-2]: https://stomp-js.github.io/api-docs/latest/
[ss-3]: https://stomp.github.io/
[ss-3-1]: https://stomp.github.io/stomp-specification-1.2.html#Changes_in_the_Protocol
[ss-4-1]: https://www.npmjs.com/package/stomp-broker-js
[ss-4-1-2]: https://github.com/4ib3r/StompBrokerJS/tree/8d8de4b5232c6fe456ee99237e9f731ce3846ed4
[ss-4-1-2-1]: https://github.com/4ib3r/StompBrokerJS/tree/8d8de4b5232c6fe456ee99237e9f731ce3846ed4/examples/sockjs
[ss-4-2]: https://github.com/pcan/node-stomp-protocol
[ss-5]: https://github.com/sockjs
[ss-5-1]: https://github.com/sockjs/sockjs-node
[ss-5-2]: https://github.com/sockjs/sockjs-node/tree/master/examples/multiplex
[ss-6]: https://www.npmjs.com/package/websocket-multiplex



## Setting up a Basic Server

At first, I wasn't quite sure if there even was a well maintained Node STOMP Broker, especially since [what seemed to be the main STOMP site][ss-3] didn't list any.  Indeed, I don't think any of the server things I've found can act as full brokers.  Fortunately, I don't really need that to play around on the client a little, just to get my feet wet, so I think I'll just ignore that limitation for now.

There's a second piece to the server side puzzle, though, and that's Web Sockets, or rather in this case, SockJS.  That's a bit easier from the Node side of things, though, since they have a [GitHub Org][ss-5] and a [Node Server][ss-4-1] right there.

Lastly, I need to know how to actually use those two things together.  STOMP is supposed to operate over WebSockets/Sock.  Perhaps peering through their examples will elucidate?


### Picking the Server Side Bits

I think for the STOMP Broker part I'll try [node-stomp-protocol][ss-4-2].  It seems to expect a WebSocket server object, but [one SockJS example][ss-4-2] seems to be passing a SockJS Service instance straight into this [websocket-multiplex][ss-5] thing, but that turned out to be explicitly for SockJS.

node-stomp-protocol seems to support anything fitting [a certain WebSocket Interface](https://github.com/pcan/node-stomp-protocol/blob/20a70a9fb0dfd853f8ee7e43460bd82024e5cb5b/src/utils.ts#L54), but I don't see anything in the [SockJS Readme](https://github.com/sockjs/sockjs-node/blob/20a70a9fb0dfd853f8ee7e43460bd82024e5cb5b/README.md) to indicate anything in there fits that interface.

However, node-stomp-protocol also supports anything fitting the same interface as [Node JS Socket][https://nodejs.org/docs/latest-v11.x/api/net.html#net_class_net_socket], which is both a Duplex Stream and an Event Emitter, which is what SockJS returns... Don't know if it needs everything to be exactly the same, but looking at [how Stream Sockets are handled](https://github.com/pcan/node-stomp-protocol/blob/20a70a9fb0dfd853f8ee7e43460bd82024e5cb5b/src/stream.ts#L38), it looks like it may be close enough?  Actually, no.  `.end()` has a different interface on Socket vs SockJS Connection, and it explicitly checks if the incoming object is an instance of a `net.Socket`.  Wouldn't work.  Dang.

> NOTE: I don't know that you actually cannot use SockJS with node-stomp-protocol, but I don't know enough to determine if I can, so I'm just going to go with the one that actually (seems to) support it.

That leaves [stomp-js-broker][ss-4-1], and I'd need to point to [the current commit on the master branch][ss-4-1-2] because it hasn't been published in a year or more as of 2019-03-13.  Ah well.  At least it has examples.  It also only supports STOMP 1.1, but eh.  That [hopefully won't break anything][ss-3-1]...


### Setting Up the Server Side Bits

- The underlying connection is determined by [using the `protocol` configuration option](https://github.com/4ib3r/StompBrokerJS/blob/8d8de4b5232c6fe456ee99237e9f731ce3846ed4/stompServer.js#L47).
- [Passing `sockjs` to this option specifies the SockJS adaptor](https://github.com/4ib3r/StompBrokerJS/blob/8d8de4b5232c6fe456ee99237e9f731ce3846ed4/lib/adapter/index.js#L10).

So, I shouldn't even need to setup anything SockJS wise myself.  Yay?  Assuming the code currently in master actually works, of course.  I'll start out by just copying their [SockJS exmaple][4-1-2-1] and go from there.

From there, it should be simple to set up:

- Pick a port, any port.
- Wrong port, that one's already in use.
- Pick almost any port.
- Pick a Web Socket Path.  I'll start with `/ws`.
- Pick a STOMP Topic.  I'll use `/echo` just to start.

Entirely coincidentally, that means I can start without modifying their code.

That didn't work because there's some casing issues in the main file.  I tried [someone's fork](https://github.com/Asc2011/StompBrokerJS), but the client seemed to die after awhile with this:

```
Opening Web Socket...
Web Socket Opened...
>>> CONNECT
Authorization:Bearer BEARS
accept-version:1.1,1.0
heart-beat:10000,10000
Unhandled frame: 
content-length:14

object Object]

Whoops! Lost connection to http://localhost:3002/ws
```

The server logs this:

```
HEALTH CHECK failed! Closing 30018 10000
DISCONNECT id0001234566778MORENUMBERS
```

Well then.

Looking at the websocket frames that are being sent and received, I see:

- The server sending `o`
- The client sending a connection string that the server seems to parse alright.  It seems to be a JSON Array of Strings?
    - Looks like there's only one string, though, and it's a `CONNECT` command followed by all the headers, new-line separated.
- The server sends back `a["[object Object]"]`.  That seems ... wrong.

Gonna suppose the current code is fubbernucked.  Maybe it's [this change here](https://github.com/Asc2011/StompBrokerJS/commit/1a42c90f5285e5eb08958ba21e5467ed2c9d52c3#diff-abc0d9513517234243e17e77d9288427R25).  Sure enough, reverting that part to the call to `toStringOrbuffer()` (and fixing [some linting issues along the way](https://github.com/joedski/StompBrokerJS/pull/1)) fixes things.  Now the client and server happily send back messages about messages.

> Aside: May want to check if I want to pull over the fix for the issue claimed in that commit message, though, that "breaks on bodies consisting only of `\n\n` thing".



## Aside: Web Sockets vs...

There are a few other methodologies that were in more common use compared to Web Sockets:

- Polling: Periodically making requests to check for updates.
- Long Polling: Client makes a request and the Server leaves the connection open, not sending a response until Much Later, usually when there are updates.
- Server Sent Events: Client makes a request and the Server responds with headers, then periodically sends events as appendations to the body, without closing the response.



## Usage Patterns on the Client

It seems like it would be wasteful to open more than one socket to a given server, which also seems like part of the reason for things like STOMP in the first place: the Client and Server can coordinate on just what data to send to each Client.  It's like [websocket-multiplex][ss-5] but with things like headers built in, more akin to a message broker service like RabbitMQ than just simple multiplexing.

Given that, it seems then that on the client, you'd have a singleton service that handles all the actually websocket/message-broker communication and exposes a nice instantial API for the rest of the client code.

Does further research into this topic bear out this speculation?  ... I don't actually know.  I'm not even sure what to search for this.  I suppose a chat
