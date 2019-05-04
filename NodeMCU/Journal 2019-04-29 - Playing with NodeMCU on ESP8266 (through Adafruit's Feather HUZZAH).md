Journal 2019-04-29 - Playing with NodeMCU on ESP8266 (through Adafruit's Feather HUZZAH)
========



## Finding the TTY Device

To find out possible devices when connecting the Feather, I diffed the listing of `/dev` before and after plugging it in:

```
20:44 $ ls /dev > dev-wo-feather.ls
20:44 $ ls /dev > dev-w-feather.ls
20:45 $ diff dev-wo-feather.ls dev-w-feather.ls 
16a17
> cu.SLAB_USBtoUART
235a237
> tty.SLAB_USBtoUART
```

In hindsight, that's pretty obvious.  But, there's hundreds of entries in there, and visual diffing ain't that easy, then.



## Connecting to the Feather/NodeMCU

First trying things from [here](https://www.cyberciti.biz/hardware/5-linux-unix-commands-for-connecting-to-the-serial-console/).


### First Try: cu

I tried this, first:

```sh
# sudo because otherwise I get an error stating "Permission denied" and "Line in use"
# -l to specify the device
# -s for baud rate
# -h for half-duplex (local echo)
sudo cu -l tty.SLAB_USBtoUART -s 9600 -h
```

But I have no idea if I can set it to send `\r\n` for EOLs, so that's probably not gonna work well for this.

Of note, the man page of `cu` says this about possible bugs in it:

```
BUGS
       This program does not work very well.
```

Well then.


### Second Try: screen

Next, gonna try `screen` I guess.

```sh
# 9600: even though that's the default
# onlcr: as per `man stty`: Map NL to CR-NL on output. (or `-onlcr` to not map)
sudo screen /dev/tty.SLAB_USBtoUART 9600,onlcr
# I tried these settings from here: http://www.noah.org/wiki/Screen_notes#using_screen_as_a_serial_terminal
# But they don't seem to help.  Alas.
sudo screen /dev/tty.SLAB_USBtoUART 9600,onlcr,cs8,-parenb,-cstopb,-hupcl
```

I also added [a `.screenrc`](http://www.noah.org/engineering/src/dotfiles/.screenrc) I found that, among other things, changes `^c k` to `^c K`, with a big K for emphasis.  You have to really mean it if you wanna kill it.

So, I can see the output from the NodeMCU, including the `>` prompt, but I can't send anything to it.

Or, wait, no, I opened up a fresh `screen` and hit the reset button and it worked?  Huh.

Anyway, it works:

```
NodeMCU 0.9.5 build 20150318  powered by Lua 5.1.4
lua: cannot open init.lua
> gpio.mode(3, gpio.OUTPUT)
> gpio.write(3, gpio.LOW) -- Turn LED #0 on
> gpio.write(3, gpio.HIGH) -- Turn LED #0 off
>
```

Odd that low turns it on, but eh.  It matches their example, so whatever.  I guess it's sinking the cathode of the LED.

UPDATE: Okay, so I tried again the next day, and couldn't get it to work on reset.  But, if I just plug it in, then open `screen` and don't reset, it works.  If I want that first arrow prompt, I can hit enter, I guess.  Lemme see if this consistently works...

I guess?  `screen` doesn't seem to be handling the restarts gracefully today, unlike yesterday.  Not sure why.


### Try to Take a Mile...

Let's try something a bit more:

```lua
i = 0
while i < 3 do
    gpio.write(3, gpio.LOW) -- LED goes on...
    tmr.delay(500000) -- wait half a sec...
    gpio.write(3, gpio.HIGH) -- LED goes off
    tmr.delay(500000) -- wait half a sec...
    i = i + 1
end
```

It works!  Seems I can't use `local` while entering stuff directly in.  Have to use a global for that.  Also seems to then restart the terminal after the loop ends.  Curious.

Also can't copy/paste directly in, I guess because it only gets `\n` and not the `\r`.  Boo.  Not sure how to fix that.


### Okay, Try to Take My Mile And Eat It?

Er, cake...?

Anyway, maybe something like this?

```sh
pbpaste | sed '/--.*$/ s///; /^ +/ s///' | tr '\n' ';' | pbcopy
```

```
i = 0;while i < 3 do;    gpio.write(3, gpio.LOW) ;    tmr.delay(500000) ;    gpio.write(3, gpio.HIGH) ;    tmr.delay(500000) ;    i = i + 1;end
```

Almost.  Can't have a semicolon come after `do`, and probably `then`/`else` as well.  Complicated.

```sh
pbpaste \
| sed 's/ *--.*$//; s/^\ *//' \
| sed '/then$/ { N; s/\n/ /; }' \
| sed '/else$/ { N; s/\n/ /; }' \
| sed '/do$/ { N; s/\n/ /; }' \
| tr '\n' ';' \
| sed 's/;$//' \
| pbcopy
```

Eeeh, it works, but it's a bit kludgy.  Need to learn more `sed`.

Also, granted, having to do this in the first place is kinda kludgy.  May want something better than `screen` if I intend to test out large code samples.

Anyway, that above script turns the nicely written while loop into ... this:

```lua
i = 0;while i < 3 do gpio.write(3, gpio.LOW);tmr.delay(500000);gpio.write(3, gpio.HIGH);tmr.delay(500000);i = i + 1;end
```

Lovely.

For now, I'll just ~~hide my shame in~~ shove it into a Bash function:

```sh
function linearize-lua() {
    sed 's/ *--.*$//; s/^\ *//' \
    | sed '/then$/ { N; s/\n/ /; }' \
    | sed '/else$/ { N; s/\n/ /; }' \
    | sed '/do$/ { N; s/\n/ /; }' \
    | tr '\n' ';' \
    | sed 's/;$//'
}

pbpaste | linearize-lua
```

So there's that.


### A Better Sed Script (Because OS X's Sed is ooooooold)

Dunno why the label command makes `{}` (and `b` and `t`?) act different, but with it there, I can no longer one-line things.  Probably because OS X's `sed` is sooooo ooooold.  GNU `sed` is shinier.

```sh
sed -E ':x
/^ +| *--.*$/ {
    s///; bx
}
$! {
    N
    /then\n|else\n|do\n|function +[^()]*\([^()]*\)\n/ {
        s/\n */ /g; bx
    }
    s/\n */; /g; tx
}'
```

Oh well.  Now it's all one command, but possibly more confusing?  Also, lesson learned: don't use `N` on the last line.  That seems to break things.

Also, this totally won't work with strings that contain double-dashes, but if you're to that point, you should probably be just uploading a file to there anyawy.



## Connecting to Wifi

To connect to Wifi, you can do something like this, starting with just listing APs:

```lua
wifi.setmode(wifi.STATION)
wifi.sta.getap(function (t)
    for k,v in pairs(t) do
        print(k .. " : " .. v)
    end
end)
```

Then connect like this:

```lua
wifi.sta.config("accesspointname","yourpassword")
wifi.sta.connect()
tmr.delay(5000000)   -- wait 5,000,000 us = 5 second
print(wifi.sta.status())
print(wifi.sta.getip())
```

Subbing in the appropriate values, of course.  It took longer than 1 second for me, so I just changed the above example to 5 seconds.

Now to actually do something with that connection.  I have a Raspberry Pi named `datamunch` that I have a test web server running on, so let's try `GET`ting that.

```lua
sk=net.createConnection(net.TCP, 0)
sk:on("receive", function(sck, c) print(c) end)
sk:connect(8000,"datamunch.local")
sk:send("GET / HTTP/1.1\r\nHost: datamunch.local\r\nConnection: keep-alive\r\nAccept: */*\r\n\r\n")
```

Aww, poo, it can't do that.  May have to look up if NodeMCU can do Bonjour support.  For now, I'll just get the IP manually since our wifi uses DHCP for IP assignment.

```lua
> sk:connect(8000,"192.168.200.73")
> sk:send("GET / HTTP/1.1\r\nHost: 192.168.200.73\r\nConnection: keep-alive\r\nAccept: */*\r\n\r\n")
-- HTTP/1.1 200 OK
-- Content-Type: text/plain; charset=utf-8
-- Content-Length: 15
-- Date: Wed, 01 May 2019 01:56:11 GMT
-- Connection: keep-alive
--
-- Hello world! :D
```

Nice.


### Bonjour Support?

Curiously, there's [a built in C-module that lets you run an mDNS _Server_](https://nodemcu.readthedocs.io/en/master/modules/mdns/), but not a client.  They do however point to [this repo here](https://github.com/udaygin/nodemcu-mdns-client) as a possible client to use.  Aight then, I'm not actually doing much with the Feather itself, and it comes with relative scads of flash space compared to an Arduino.  I mean, it can run a Lua interpreter for heaven's sake.

The other option of course is to just ping everyone on the network then interrogate each one at a given port with a given request, expecting a given response, which wouldn't look suspicious at all.  Not one bit.

I'll have to try putting this in and loading it up from the `init.lua` file, see if it works.


### So Far, So Good

All in all, that's enough to get started.  I guess this also means I can just print stuff to the console and maybe make a top level module thingy for interrogating the current status?  Hmmmm.

Though, for my intended use case, I also wonder if I can actually use NodeMCU the way I want to: Shut down most of the time, but wake up, take a reading, connect to wifi, shoot the reading on over, disconnect, then go back to sleep.  Hmm, hmm, hmm.

Make it work, first, then make it secure, then make it efficient.  I may also want to [create a custom build](https://nodemcu-build.com/index.php) at some point so I don't need to have anything I'm not using, and can ensure TLS support.


### Serializing to JSON

Lua just uses Tables as its generic data structure, for handling lists and dictionaries both.  In fact, you can index a table with anything in Lua except for `nil`...  But JSON only does arrays and objects, so none of that silliness here.

NodeMCU has, as of writing, [sjson](https://nodemcu.readthedocs.io/en/master/modules/sjson/) to handle serialization and deserialization.  It supports streaming to handle JSON data larger than memory, though my use case doesn't require this.  Still, nice to have.

You can construct tables thusly in Lua:

```lua
dictTable = { foo = "Foo!", bar = "Bar!" }
listTable = { "Foo!", "Bar!" }
```

Let's see if `sjson` distinguishes between those two things as expected...

```lua
dictTable = { foo = "Foo!", bar = "Bar!" }
listTable = { "Foo!", "Bar!" }
bothTable = { dict = dictTable, list = listTable }
ok, result = pcall(sjson.encode, bothTable)
if ok then
    print("json: " .. result)
else
    print("error! " .. result)
end
```

> NOTE: [`pcall`](https://www.lua.org/pil/8.4.html) returns either `true, value` or `false, error`.

Hmm, seems `sjson` is `nil`.  I guess I'll need to update the firmware for that... Let's see, `NodeMCU 0.9.5 build 20150318`?  Oooh, yeah, that's about 2 years out of date.

How about `cjson`?

```
> print(cjson)
romtable: 4023d348
```

Okay, so I can try that out, at least.  I don't even need to update anything, though I can't guarantee it'll act exactly the same.  That said, the `sjson` docs say that [`sjson.encode()` is provided as a convenience method for backwards compatability with `cjson`](https://nodemcu.readthedocs.io/en/master/modules/sjson/#sjsonencode).

```lua
dictTable = { foo = "Foo!", bar = "Bar!" }
listTable = { "Foo!", "Bar!" }
bothTable = { dict = dictTable, list = listTable }
ok, result = pcall(cjson.encode, bothTable)
if ok then
    print("json: " .. result)
else
    print("error! " .. result)
end
```

```json
{"dict":{"bar":"Bar!","foo":"Foo!"},"list":["Foo!","Bar!"]}
```

Nice.

> Note that in the serialization of `dictTable`, `bar` came before `foo`.  Not unexpected, of course, just another reminder that tables' string-keys aren't really ordered, nor technically are JSON objects' keys.

For my one sensor thing, I was thinking originally of just using array records because those would be easy to stringify, but this is probably safer and ultimately more flexible.  That and honestly, it's not that much memory for a single record regardless.

Original thought, formatted:

```json
[
    "esp8266#1",
    "BME680",
    ["T","C",21.5],
    ["P","kPa",101.3],
    ["H","R%",45]
]
```

Current thought, formatted:

```json
{
    "id": "esp8266#1",
    "sensor": "BME680",
    "readings": [
        ["T","C",21.5],
        ["P","kPa",101.3],
        ["H","R%",45]
    ]
}
```
