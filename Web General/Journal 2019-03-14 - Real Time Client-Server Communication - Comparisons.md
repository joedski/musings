Journal 2019-03-14 - Real Time Client-Server Communication - Comparisons
======

Sources:

1. [A comparison between Polling, Long Polling, Server-Sent Events, and Web Sockets][ss-1]
2. [A post on why Long Polling is Bad ("The Myth of Long Polling")][ss-2]
    1. The resource usage thing seems to be counter to [(Ss 1)][ss-1]?
    2. [Response stating that most major real-time messaging apps do not use WebSockets because they're difficult to load balance][ss-2-2].
3. Informational Documents:
    1. [MDN Docs on WebSocket API][ss-3-1]
    2. [MDN Docs on EventSource][ss-3-2]
4. [Overview of Server-Sent Events, WebSockets, and Polling, and some comparisons between them][ss-4]
    1. Seems pretty even handed.  Nice overviews.
    2. Notes that SSE (if supported) is good for models where you're just getting data from the server, but not so great for bidirectional communication.  WebSockets are better for that.
5. [This one, showing there are other options besides WebSockets][ss-5]
    1. It has cute animations.
6. [A Server-Sent Events Tutorial][ss-6]

[ss-1]: https://codeburst.io/polling-vs-sse-vs-websocket-how-to-choose-the-right-one-1859e4e13bd9
[ss-2]: https://blog.baasil.io/why-you-shouldnt-use-long-polling-fallbacks-for-websockets-c1fff32a064a
[ss-2-2]: https://medium.com/@bretep/tldr-load-balancing-ws-s-at-scale-is-very-difficult-which-is-why-the-leading-realtime-messaging-704e9a0d1686
[ss-3-1]: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
[ss-3-2]: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
[ss-4]: https://codeburst.io/polling-vs-sse-vs-websocket-how-to-choose-the-right-one-1859e4e13bd9
[ss-5]: https://blog.stanko.io/do-you-really-need-websockets-343aed40aa9b
[ss-6]: https://medium.com/conectric-networks/a-look-at-server-sent-events-54a77f8d6ff7

Current points:

1. Server Sent Events
    - Notes
        - Server Sent Events are interacted with via [Event Sources][ss-3-2].
        - Server Sent Events are one-way, from Server to Client.  The only time the Client sends something to the Server is for the initial request to open the Events channel.
    - Pros
        1. Easy to use.
        2. Allegedly: [Clients automatically try to reconnect them if they drop for any reason][ss-6].
    - Cons
        1. [Not supported by everyone](https://caniuse.com/#search=eventsource). (IE, Edge as of v18)
        2. No way to tell if a Client dropped until the Server tries sending an event.
2. WebSockets
    - Pros
        1. Can have 1024 Client-Server connections, vs only 6 as allowed by HTTP/1.
    - Cons
        1. Allegedly: [Hard to load balance, dealing with proxies is difficult][ss-2-2].
3. Long Polling
    - Cons
        1. Allegedly: [Resource intensive][ss-2] due to leaving all those sockets open.
