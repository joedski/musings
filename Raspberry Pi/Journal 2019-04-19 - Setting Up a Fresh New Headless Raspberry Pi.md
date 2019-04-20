Journal 2019-04-19 - Setting Up a Fresh New Headless Raspberry Pi
=================================================================

Journal where I try to setup a headless Raspberry Pi Zero W, end up having to use a monitor anyway, and finally get things working.

1. Setup Guides
    1. [SSH over Wifi, with Mac-centric instructions][ss-1-1]
        1. Windows instructions are linked at the top of the post.
    2. [SSH over USB, with Mac-centric instructions][ss-1-2]
        1. [Gist author of above post referenced][ss-1-2-1]
            1. [Comment in there about setting a static IP to get Raspian Stretch to work][ss-1-2-1-1]
    3. [Raspberry Pi in OTG Mode][ss-1-3]
        1. [Raspberry Pi in OTG Mode: Using the Modules][ss-1-3-1]
    4. [Raspberry Pi - SSH over USB Quick Guide][ss-1-4]
2. Misc Resources
    1. [Informal SD Card Compatibility List][ss-2-1]
    2. [Raspian Downloads][ss-2-3]
    3. [Old post about a security update for Raspbian Pixel][ss-2-4]
        1. Note the section on SSH.

[ss-1-1]: https://desertbot.io/blog/setup-pi-zero-w-headless-wifi
[ss-1-2]: https://desertbot.io/blog/ssh-into-pi-zero-over-usb/
[ss-1-2-1]: https://gist.github.com/gbaman/975e2db164b3ca2b51ae11e45e8fd40a
[ss-1-2-1-1]: https://gist.github.com/gbaman/975e2db164b3ca2b51ae11e45e8fd40a#gistcomment-2504808
[ss-1-3]: https://gist.github.com/gbaman/50b6cca61dd1c3f88f41
[ss-1-3-1]: https://gist.github.com/gbaman/50b6cca61dd1c3f88f41#using-the-modules
[ss-2-1]: https://elinux.org/RPi_SD_cards
[ss-2-3]: https://www.raspberrypi.org/downloads/raspbian/
[ss-2-4]: https://www.raspberrypi.org/blog/a-security-update-for-raspbian-pixel/




# Stepping Through the Tuts

I mainly followed [these instructions on setting a Pi up via Mac for SSH over Wifi][ss-1-1], though I took a detour to first [SSH over USB][ss-1-2] for reasons.



## Step 1: Initialize the SD Card

I got a nice fat 64GB card from Microcenter, which was listed as [having been tested to work.][ss-2-1], [downloaded][ss-2-3] the Raspian Lite image, verified the checksum with `shasum -a 256` (Hopefully nobody MITM'd the whole site!), and went to `dd`ing that image into the SD card.

```
$ shasum -a 256 2019-04-08-raspbian-stretch-lite.zip ; echo 03ec326d45c6eb6cef848cf9a1d6c7315a9410b49a276a6b28e67a40b11fdfcf

03ec326d45c6eb6cef848cf9a1d6c7315a9410b49a276a6b28e67a40b11fdfcf  2019-04-08-raspbian-stretch-lite.zip
03ec326d45c6eb6cef848cf9a1d6c7315a9410b49a276a6b28e67a40b11fdfcf

$ diskutil list

...
/dev/disk9 (external, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:     FDisk_partition_scheme                        *62.3 GB    disk9
   1:               Windows_NTFS                         62.3 GB    disk9s1

$ diskutil unmountDisk /dev/disk9

Unmount of all volumes on disk9 was successful

$ sudo dd bs=1m if=./2019-04-08-raspbian-stretch-lite.img of=/dev/disk9

Password:
1720+0 records in
1720+0 records out
1803550720 bytes transferred in 380.674769 secs (4737773 bytes/sec)

$
```



## Step 2: Enable SSH

You have to explicitly opt into SSH, which is good considering the image starts out with a default password.

```
$ touch /Volumes/boot/ssh
```



## Step 3: Some Config Files

According to the [SSH over USB instructions][ss-1-2], we do these updates here:


### Updating config.txt

```
$ echo "dtoverlay=dwc2" >> /Volumes/boot/config.txt
```

There's more detail on that overlay thingy in the `/boot/overlays/README` file:

> This directory contains Device Tree overlays. Device Tree makes it possible
to support many hardware configurations with a single kernel and without the
need to explicitly load or blacklist kernel modules. ...

Here's a description of the overlay we chose:

```
Name:   dwc2
Info:   Selects the dwc2 USB controller driver
Load:   dtoverlay=dwc2,<param>=<val>
Params: dr_mode                 Dual role mode: "host", "peripheral" or "otg"

        g-rx-fifo-size          Size of rx fifo size in gadget mode

        g-np-tx-fifo-size       Size of non-periodic tx fifo size in gadget
                                mode
```

Since it seems to also control some additional features like I2C, I2S, and SPI support, and so on, it may be worth investigating when tuning power consumption.  There's a handy list of overlays available at the end of the document too.


### Updating cmdline.txt

```
$ vi /Volumes/boot/cmdline.txt
```

A quick edit to insert `modules-load=dwc2,g_ether` after the `rootwait` word, taking care to have only 1 space betwixt neighbors, and that should be good to go.


### Connecting the First Time

We can now eject the card with `diskutil eject /dev/disk9` (well, `disk9` in my cases.  actually verify the disk you have before running that, of course!), slap it into the Pi, and boot her up.  May take a whole 90 seconds to boot up, the horror.  Should only take that long the first time, though.

We then should be able to login for the first time.  Apparently the default user is `pi`.

To start, use the `-R` of `ssh-keygen` clear any previous keys belonging to a given host.  From the man file:

```
     -R hostname
             Removes all keys belonging to hostname from a known_hosts file.
             This option is useful to delete hashed hosts (see the -H option
             above).
```

Thus:

```
$ ssh-keygen -R raspberrypi.local
Host raspberrypi.local not found in /Users/MEEE/.ssh/known_hosts
```

Oh, well, there we go, then.

Next, we can actually SSH in:

```
$ ssh pi@raspberrypi.local
```

Apparently it can just not respond the first time, so in such a case we should just `^C` and try again.

... Aaand still nothing!  Try `raspberrypi.lan`?  Nope, instant nothing.  Hm.

#### Give It a Static IP?

I see this noted both in the [this guide on setting the Pi up in OTG mode][ss-1-3-1] and also [this comment concerning Raspian Stretch][ss-1-2-1-1] in another gist.

In [that comment][ss-1-2-1-1], they added this to `/etc/rc.local` before the `exit 0` line:

```
sudo ifconfig usb0 169.254.xxx.xxx
```

Where the `xxx`s both get replaced with whatever address bytes you want.  I'll try `64` for both.  ... Actually, scratch that, I can't even get into the headless box yes.  HMMM.

#### Okay, So Is There an IP?

Not sure where else to go right now, but the Pi is supposed to be setup currently as a USB Ethernet thingy.  OTG is apparently a Gadget mode, and if I look in the Network system config section, I see this new entry named "RNDIS/Ethernet Gadget".  On top of that, if I do an `ifconfig` I see this new entry:

```
en8: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
    options=4<VLAN_MTU>
    ether 4a:fb:c2:88:ad:52 
    inet6 fe80::8fd:fb5f:9316:473d%en8 prefixlen 64 secured scopeid 0x16 
    inet 169.254.72.42 netmask 0xffff0000 broadcast 169.254.255.255
    nd6 options=201<PERFORMNUD,DAD>
    media: autoselect (100baseTX <full-duplex>)
    status: active
```

That might be something.  However, I also just learned that [I'll probably need to add the `/boot/ssh` file back because it gets deleted every bootup][ss-2-4].

Checking the card again, it is indeed gone.  Right!  Security isn't always the most convenient thing.  Let's `touch` that again.  Then boot up the pi again, and see if any other 196.254.x.x addresses appear...

Trying `arp -a` and `ping 169.254.255.255` turned up nothing.  Even worse, `ping` gave back `ping: sendto: Host is down` and then `Request timeout for icmp_seq 0` for the pings themselves.  Hmmmm.

Nothing.



## Step ?: Restart From the Top, But With Some Booting?

Seems many people are having trouble with using Raspbian Stretch with the above tutorials, while others mysteriously don't seem to have issues.  I could try Jessie, but I'd prefer not to use an older version or something.  I dunno.  Too much trouble or just how annoyed I am, now.

Somewhere in my skimming of things, I saw someone suggest starting with a fresh image, booting it up unmodified, _then_ modifying the config and `touch`ing `ssh`, then booting it up again to see if that works.

So, let's try that.  If that doesn't work, then I'll try actually booting the thing up by itself and using a keyboard.

No dice.  I guess lunch, then monitor/keyboard time.

Or no, because I don't have a monitor with an HDMI port.  Nice.  DVI?  Yes.  VGA?  Actually, yes.  DisplayPort?  Also yes.  But no HDMI.  Oy.

I guess that leaves Wifi for headless setup.

The frustrating thing is that the instructions I found for setting up a headless Pi over Wifi tell you to try setting it up over USB if it doesn't work!  But it's already not working, and I don't know enough to know why!  The only thing I can imagine is that it's because it's using Raspbian Stretch instead of Jessie.



## Step 3.1: Less OTG, More Wifi

So, instead of doing those above changes to `config.txt` and `cmdline.txt`, we'll do this instead:

```
$ vi /Volumes/boot/wpa_supplicant.conf
```

```
country=US
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
    ssid="NETWORK-NAME"
    psk="NETWORK-PASSWORD"
    key_mgmt=WPA-PSK
}
```

Then we just hope there's no one on the network sniffing for Pis with default credentials.  Good times.  (That's probably indicative of something far worse, really)

Anyway, `touch ssh` and we're hopefully good to go.  Eject, boot it, and poke the local network.

### Nope.  Retry?

That did ... nothing.  Okay, let's try reimaging the disk, yet again, and just going straight for the Wifi.  Failing that, try my 2.4GHz network, as my 5GHz is kinda far away.

Putting it on the 2.4GHz network makes it findable, though I'm honestly not sure if I actually would not have found it on the 5GHz.  But, I'm running into a new problem: Trying to SSH in gives me this: `Connection reset by fe80::af41:fb03:faba:7768%en0 port 22`

Going into verbose mode, I see this:

```
$ ssh -v pi@raspberrypi.local
OpenSSH_7.6p1, LibreSSL 2.6.2
debug1: Reading configuration data /Users/MEEE/.ssh/config
debug1: Reading configuration data /etc/ssh/ssh_config
debug1: /etc/ssh/ssh_config line 48: Applying options for *
debug1: Connecting to raspberrypi.local port 22.
debug1: Connection established.
debug1: identity file /Users/MEEE/.ssh/id_rsa type 0
debug1: key_load_public: No such file or directory
debug1: Local version string SSH-2.0-OpenSSH_7.6
debug1: Remote protocol version 2.0, remote software version OpenSSH_7.4p1 Raspbian-10+deb9u6
debug1: match: OpenSSH_7.4p1 Raspbian-10+deb9u6 pat OpenSSH* compat 0x04000000
debug1: Authenticating to raspberrypi.local:22 as 'pi'
debug1: SSH2_MSG_KEXINIT sent
Connection closed by fe80::af41:fb03:faba:7768%en0 port 22
```

So, it's there, and it's running OpenSSH, but I can't connect because it closes the connection.

- https://stackoverflow.com/questions/47005838/connection-reset-by-ssh-hostname-port-22
- https://raspberrypi.stackexchange.com/questions/7112/ssh-not-working/60375#60375

Neither of those really worked.

- https://www.raspberrypi.org/forums/viewtopic.php?t=177111 (2017-03-12)

According to this link, "Apparently, the SSH keys (/etc/ssh/ssh*key) on the Raspberry were all of zero size for some reason.  ..."

Er, okay, so I just plain can't set it up headless over SSH?  Grand.

- More recent attempt by someone in 2018: https://www.raspberrypi.org/forums/viewtopic.php?t=210313

I guess I'll try just retry... again?

- A Debugging Journal: http://codeandcoffee.us/raspberry-pi-ssh-connection-reset/
- Stack Exchange question that has the same solution as that blog post: https://raspberrypi.stackexchange.com/questions/7112/ssh-not-working/60375#60375

Apparently a `SSH2_MSG_KEXINIT sent` followed by the connection being closed or reset means that there's an issue loading the system SSH keys.  They then tailed `auth.log`, which I can't do...

Okay, I've tracked down a monitor with an HDMI port, and, yep, the pi sure does boot.


### Aside: Dvorak

I went through an experimental phase in college...

Anyway, [Debian has a pretty friendly way to set that up](https://wiki.debian.org/Keyboard).  However, that doesn't seem to affect the login prompt, so that's a bit odd.  Oh well.  Back to important things.


### Back to Our Show

Looks like all the `ssh_host_*_key` files are 0 bytes... yep, just like in [that post](http://codeandcoffee.us/raspberry-pi-ssh-connection-reset/).

```
$ sudo rm /etc/ssh/ssh_host_* && sudo dpkg-reconfigure openssh-server
```

And now, they're fat and happy non-zero-length files.  Yay.  Does this make SSH work?

Yes.  Finally!  Eesh.  Seems like it needs a head before you can go headless.  That's really annoying, but it's hopefully a one-time thing.



## Step Scramble: Change Everything

We should then be able to do `sudo raspi-config` to change a bunch of things:

- Network > Hostname
- Advance > Gobble Up All SD Card Space

```
$ df -hl
Filesystem      Size  Used Avail Use% Mounted on
/dev/root        58G  1.1G   54G   2% /
devtmpfs        213M     0  213M   0% /dev
tmpfs           217M     0  217M   0% /dev/shm
tmpfs           217M  3.1M  214M   2% /run
tmpfs           5.0M  4.0K  5.0M   1% /run/lock
tmpfs           217M     0  217M   0% /sys/fs/cgroup
/dev/mmcblk0p1   43M   22M   21M  51% /boot
tmpfs            44M     0   44M   0% /run/user/1000
```

And then, once we're all fat and happy, we can update ALL THE THINGS.

```
$ sudo apt-get update -y
$ sudo apt-get upgrade -y
```

> 1 Year Later... &lt;/spongebob>

ye.




# On To Other Things: NodeJS

I'm lazy and don't want to make the teeny tiny effort to learn Python (even though [I am](../Sublime%20Text/Journal%202019-02-28%20-%20My%20First%20Sublime%20Text%203%20Plugin.md)) and would rather just use Koa for everything.  I mean, everyone needs an event loop just to serve static files amirite?  Nginx?  What's that?

Anyway, I guess you [install the thing](https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions) like this:

```sh
curl -sL https://deb.nodesource.com/setup_11.x | sudo bash -
apt-get install -y nodejs
```

```
## You appear to be running on ARMv6 hardware. Unfortunately this is not currently supported by the NodeSource Linux distributions. Please use the 'linux-armv6l' binary tarballs available directly from nodejs.org for Node.js 4 and later.
```

Herp.

I guess you don't.

Going to try [this set of instructions](https://www.thepolyglotdeveloper.com/2018/03/install-nodejs-raspberry-pi-zero-w-nodesource/), then, seeing as we have to go through nodejs.org anyway.

First thing I have to do is go [here, a dist list](https://nodejs.org/dist/).  What're we looking for?  A tarball with `linux-armv6l` in it, just like the error message said.  Might as well start with the latest we can, so let's go for [the 11.14.0 tarball](https://nodejs.org/dist/v11.14.0/node-v11.14.0-linux-armv6l.tar.gz).

```sh
curl -o node-v11.14.0-linux-armv6l.tar.gz https://nodejs.org/dist/v11.14.0/node-v11.14.0-linux-armv6l.tar.gz
# don't spam the SSH connection with v, I guess.
tar zxf node-v11.14.0-linux-armv6l.tar.gz
./node-v11.14.0-linux-armv6l/bin/node -v
#    v11.14.0
sudo cp -r node-v9.7.1-linux-armv6l/* /usr/local/
# Now, we should have node and npm in the path.
node -e 'console.log("hello world")'
#    hello world
# Also, npm kinda expects git to be around, so install that too.
sudo apt-get install git
# Just because.
sudo apt-get install jq
```

Alright.  Let's see a node startup comparison between my Big Mean Laptop and the Pi.

```
LappyToppy $ time node -e 'console.log("hello world")'
hello world

real    0m0.303s
user    0m0.069s
sys 0m0.064s

RaspberryPi $ time node -e 'console.log("hello world")'
hello world

real    0m1.382s
user    0m1.269s
sys 0m0.071s
```

Yeah, pretty much.  I mean, it's an ARMv6, whadoyawant?



## Koa Hello World

Just a tiny little server:

```js
const Koa = require('koa');

const app = new Koa('hello-world');

app.use(async function helloWorld(ctx, next) {
  ctx.body = 'Hello, world!';
});

const PORT = process.env.PORT || 8000;

app.listen(PORT)
console.log(`Listening on port ${PORT}`);
```

```
$ node app
Listening on port 8000
```

Back on the main poot:

```
$ curl http://datamunch.local:8000
Hello, world!
```

It also works on my phone.

_Nice_.

Seems to respond snappily enough, certainly enough for my needs.

And if I feel like serving static files only, I could always just [use nginx](https://www.raspberrypi.org/documentation/remote-access/web-server/nginx.md).




# Enable Tunneling Over USB?

Now that I've got the SSH thing fixed, maybe I can actually get in over USB, now?  First, do those config updates in `/boot/{config,cmdline}.txt`, `shutdown -r now`, SSH in over wifi to confirm things are still alive and well... then try plugging it in on USB.

Hmm, don't see the extra `en8` that I saw before from `ifconfig`.  The Network system preferences GUI doesn't show anything, either.

If I unplug it and plug it back in... Heckin, it appeared.  ... then disappeared?  Now I am confusion.

Perhaps something has just changed in Rapsbian Stretch that I just don't understand, and it can't be used as a USB ethernet thingy?  Or else there's extra config needed?  Most instructions talk about Jessie, and [many other people talk about the usual instructions not working with Stretch](https://gist.github.com/gbaman/975e2db164b3ca2b51ae11e45e8fd40a#gistcomment-2893200).

I tried going through [the longer instructions][ss-1-3], but that doesn't seem to have done anything extra.  Alas.

Or, wait, I unplugged it again after those longer instructions, then plugged it back in, and it's not going away, now, and does seem to be showing up.  Does it continue to show up?

```
$ system_profiler

...
        RNDIS/Ethernet Gadget:

          Product ID: 0xa4a2
          Vendor ID: 0x0525  (PLX Technology, Inc.)
          Version: 4.14
          Speed: Up to 12 Mb/sec
          Manufacturer: Linux 4.14.98+ with 20980000.usb
          Location ID: 0x14100000 / 2
          Current Available (mA): 500
          Current Required (mA): 2
          Extra Operating Current (mA): 0

$ ifconfig

en8: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
    options=4<VLAN_MTU>
    ether fe:ce:f8:63:e3:ef 
    inet6 fe80::8a8:a1b2:eedf:974c%en4 prefixlen 64 secured scopeid 0xd 
    inet 169.254.14.43 netmask 0xffff0000 broadcast 169.254.255.255
    nd6 options=201<PERFORMNUD,DAD>
    media: autoselect (10baseT/UTP <full-duplex>)
    status: active
```

But doing `ping 169.254.255.255` turns up only myself, and trying to `ssh pi@169.254.64.64` gets nothing.  I can still SSH in over wifi, though?  Perhaps when wifi is on, I can't also network over USB.  Trying to `ping 169.254.14.43` from the Pi turns up nothing, even after forcing an address with `sudo ifconfig usb0 169.254.64.64 netmask 255.255.0.0`.

That might be the problem, now, then: I can't have both Wifi and USB.  Damn.  That means either I have Wifi or no Wifi.  Bah.  I guess I'll take Wifi, then.

I tried putting it back on the 5GHz network again, but no dice.  Ah well, it's not like it needs that much bandwidth.  Pulling the SD card, resetting `wpa_supplicant.conf` to point to the 2.4GHz net, and popping it back in fixes things.

Maybe if I setup [network sharing](https://raspberrypi.stackexchange.com/a/50073)?  (Also [here on Instructibles](https://www.instructables.com/id/Share-WiFi-With-Ethernet-Port-on-a-Raspberry-Pi/))  It even has Stretch-specific instructions... But it uses LX or something, which I'm not interested in.  Something to consider, though, I guess.  Maybe there's another rc file or something I can use?
