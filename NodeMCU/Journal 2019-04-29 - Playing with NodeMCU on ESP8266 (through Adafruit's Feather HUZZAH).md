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
    /then$|else$|do$/ {
        N; s/\n */ /g; bx
    }
    N; s/\n */; /; tx
}'
```

Oh well.  Now it's all one command, but possibly more confusing?  Also, lesson learned: don't use `N` on the last line.  That seems to break things.

Also, this totally won't work with strings that contain double-dashes, but if you're to that point, you should probably be just uploading a file to there anyawy.
