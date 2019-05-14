Journal 2019-05-05 - mDNS Query Support in NodeMCU Lua
========

There's a maintained library for running an mDNS server, but not making queries...

I [forked an existing client lib](https://github.com/joedski/nodemcu-mdns-client) so I could tweak it (and have a repo to track changes) while I [work on a PoC](https://github.com/joedski/nodemcu-mdns-client-test), but so far it's not quite working.

I don't seem to get any actual results back and every so often it crashes with `PANIC: unprotected error in call to Lua API (mdnsclient.lua:228: unknown error)`.  The exact line is this: `s:send(mdns_port, mdns_multicast_ip, mdns_make_query(ptr))`.  It's in a for loop, though, so I wonder if it's spamming `s:send` too much?

[The docs](https://nodemcu.readthedocs.io/en/master/modules/net/) say this on that topic:

> Multiple consecutive send() calls aren't guaranteed to work (and often don't) as network requests are treated as separate tasks by the SDK. Instead, subscribe to the "sent" event on the socket and send additional data (or close) in that callback. See [#730](https://github.com/nodemcu/nodemcu-firmware/issues/730#issuecomment-154241161) for details.

It seems that [the API used to buffer `sck:send` calls, but no longer does](https://github.com/nodemcu/nodemcu-firmware/issues/730#issuecomment-154285911).  Guess I'll have to fix that in my fork.

I guess the first thing to do is to rewrite the query part so that it only sends one request at a time.  Maybe make a send-marshaller thingy?  Hm.



## Marshalling Messages

So, we need our own message queue bound to the given socket.  Here's an outline of operation for a simple queue:

- When pushing a message:
    - Add the message to the queue.
    - Send the next message.
- When sending the next message:
    - Is a message send pending?
        - If yes, return.
        - If no:
            - Dequeue the next message.
            - Send the message into the socket.
            - Update state to note that a message send is pending.
- When a message has been sent:
    - Update state to note than no message send is pending.
    - Are there are still messages in the queue?
        - If yes:
            - Send the next message.
        - If no, return.



## In the Mean Time: Making Raw Queries?

Since I'm not actually interested in services, and that mdns client was written a long, long time ago (in internet years!), maybe I can try somethin newer?

While looking about for other ways resolve names via mDNS, I ran into [this post about the pen testing possibilities of mDNS](https://blog.hyperiongray.com/multicast-dns-service-discovery/), which had this command:

```sh
dig @224.0.0.251 -p 5353 +short ${NAME}.local
```

Where in my case, to query for my Raspberry Pi named `datamunch`, I'd set `NAME=datamunch`.

Taking off the `+short`, you get the full output:

```
; <<>> DiG 9.10.6 <<>> @224.0.0.251 -p 5353 datamunch.local
; (1 server found)
;; global options: +cmd
;; Got answer:
;; WARNING: .local is reserved for Multicast DNS
;; You are currently testing what happens when an mDNS query is leaked to DNS
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 57486
;; flags: qr aa; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 0

;; QUESTION SECTION:
;datamunch.local.       IN  A

;; ANSWER SECTION:
datamunch.local.    10  IN  A   192.168.200.73

;; Query time: 145 msec
;; SERVER: 192.168.200.73#5353(224.0.0.251)
;; WHEN: Sat May 11 23:22:49 EDT 2019
;; MSG SIZE  rcvd: 49
```

`dig` is the "domain information groper", which does just that.  That makes me wonder if I can just send standard DNS queries to that mDNS multicast address.  It seems like that would be the case if I can use standard tools to poke it.  You can also query `PTR` records:

```sh
# e.g. Printers
dig @224.0.0.251 -p 5353 -t ptr +short _printer._tcp.local
# Brother\032DCP-L2540DW\032series._printer._tcp.local.
```

But that's not what I'm looking for, I just want name-to-address resolution.


### DNS Resolution in NodeMCU Lua

The first thought I had was to just try `net.dns.resolve()`, but that doesn't really work, probably because I can't set the port to 5353.

```
> net.dns.setdnsserver('224.0.0.251:5353', 0)
stdin:1: unexpected symbol near 'char(27)'
> net.dns.setdnsserver('224.0.0.251', 0)
> net.dns.resolve('datamunch.local', function(sk, ip)
>> print(ip)
>> end)
> nil
```

So, we'll need something a bit more complicated than that.

Next thing to try: `net.socket:dns()`, which the docs say "Provides DNS resolution for a hostname".  Unfortunately, there doesn't seem to be any option to parametrize it.  Their example code is this:

```lua
sk = net.createConnection(net.TCP, 0)
sk:dns("www.nodemcu.com", function(conn, ip) print(ip) end)
sk = nil
```

Seems like it's just a local reference to `net.dns.resolve`, or at least acts like it.  Or that `net.dns.resolve` is basically just a wrapper around `sk:dns` which auto-creates its own socket.  Blah.  So much for the easy route.



## Building DNS Requests

I can't seem to find any immediate gratification by reading the spec or by searching for dissections, so I decided to just dig into [some source code](https://github.com/nodemcu/nodemcu-firmware/blob/4905381c004bdeaf744a60bb940c1906c2e052d4/app/lwip/core/dns.c#L572).

I'm not as used to C as written there, lots of pointer math.  Never the less, I'm able to more or less understand what's happening after finding the macros and [whatnot](https://github.com/nodemcu/nodemcu-firmware/blob/4905381c004bdeaf744a60bb940c1906c2e052d4/app/include/lwip/dns.h#L49).  There's some [mysterious endian flipping](https://github.com/nodemcu/nodemcu-firmware/blob/4905381c004bdeaf744a60bb940c1906c2e052d4/app/include/lwip/def.h#L112), but apparently that's because network stuff is big endian while CPUs tend to be little endian?  Either way, there's an endian mismatch, and the flip needed to happen.


### The Structure: The Request

> NOTE: Network stuff is usually big-endian: `0x1234` is `0x12 0x34`, not `0x34 0x12`.  This is important for writing and parsing messages.

Stepping through the code, it seems to build the request thusly:

- Header:
    - U16 ID
        - Set to a random value.
    - U8 Flags 1
        - Set to `DNS_FLAG1_RD = 0x01`
    - U8 Flags 2
        - Left as 0.
    - U16 Number of Questions
        - Set to 1, because we're requesting a single record.
    - U16 Number of Answers
        - Left as 0, because we're asking questions, not sending answers.
    - U16 Number of AUTHRR (?)
        - Left as 0.
    - U16 Number of EXTRARR (?)
        - Left as 0.
- Payload:
    - First (and only) Question:
        - The Name:
            - For however many name-pieces:
                - Byte telling receiver how many bytes are to follow for the next name-piece.
                - N bytes with the name-piece.
            - Lastly, a null byte, `0x00`.
        - U16 RRType
            - We're requesting A-type records, in this case, so `0x00 0x01`.
        - U16 RRClass
            - Dunno if we ever use any class other than `IN`, so `0x00 0x01`.
- End!

If we then step back through the [`mdns_make_query` function in `nodemcu-mdns-client`](https://github.com/joedski/nodemcu-mdns-client/blob/f243351a72d16b25677697c42a85ca85b0d250e7/mdns.lua#L29), we see basically the same thing, except that the transaction ID is always `0x00 0x00`, and the RRType is `0x00 0x0c`, AKA `PTR` type records.


### The Structure: The Answer

Given the above, and that `dig` worked before, I'm going to assume (heh!) that mDNS responses follow the same structure as standard DNS Responses.

Looking at [the response parser `mdns_parse_query`](https://github.com/joedski/nodemcu-mdns-client/blob/f243351a72d16b25677697c42a85ca85b0d250e7/mdns.lua#L39), we see this:

- A check for Flags-1 `RESPONSE = 0x80`, which tells us it's a response.  If not, bail.
- A check for Flags-1 `TRUNC = 0x02`, which tells us something got truncated somewhere.  If yes, bail.
- A check of Answer Count.  If it's 0, bail, because there are no answers.
- If everything is fine, parse the answers!
