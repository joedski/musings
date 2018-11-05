Not Waking Up - Macbooks With OWC SSDs
======================================

1. [OWC blogpost on setting Standby Delay to 24 hours](https://blog.macsales.com/19893-trouble-waking-up-after-a-deep-sleep)
  1. Basically `sudo pmset -a standbydelay 86400`
  2. They disrecommend setting it longer than that for reasons of power saving.
2. [ZDNet article on faster wakeups from sleep](https://www.zdnet.com/article/faster-wake-from-sleep-on-macbooks/)
  1. Essentially the same as [(Ss 1)](https://blog.macsales.com/19893-trouble-waking-up-after-a-deep-sleep).
3. `man pmset`
  1. Notably, under the _SAFE SLEEP ARGUMENTS_ section, it states: "For example, on desktops that support _standby_ a hibernation image will be written after the specified `standbydelay` time. **To disable hibernation images completely, ensure `hibernatemode` `standby` and `autopoweroff` are all set to 0.**"
  2. On `hibernatemode = 0`: "`hibernatemode = 0` by default on desktops. The system will not back memory up to persistent storage. The system must wake from the contents of memory; the system will lose context on power loss. **This is, historically, plain old sleep.**"



## Thoughts

1. Most of my important things are up in the cloud in various places.  Dropbox, Box, whatever else clients have used in the past, iCloud, Github, etc.
2. In [Ss 1](https://blog.macsales.com/19893-trouble-waking-up-after-a-deep-sleep) they disrecommend setting `standbydelay` longer than that for reasons of power saving.
  1. Given that my computer will reboot with loss of state regardless when waking from what is probably deep sleep, normal sleep killing the battery is no different to me than going into a deep sleep.
  2. I don't usually have it unpowered for more than 24 hours, either, though, so actually setting it to 24 hours would effectively be the same to me.
3. So, I might as well just do what was pointed out in `man pmset` and set those three settins to `0`, taking note that on power loss, I'll lose the last state.  Again, though, see _Thought 2.1_.


### On Execution

> NOTE: Here be dragons.  Don't do this unless you know what you're doing or you're foolhardy like me and willing to own up to your f-ups.

```
$ sudo pmset -a hibernatemode 0
Password:
Warning: Idle sleep timings for "Battery Power" may not behave as expected.
- Disk sleep should be non-zero whenever system sleep is non-zero.
Warning: Idle sleep timings for "AC Power" may not behave as expected.
- Disk sleep should be non-zero whenever system sleep is non-zero.

$ sudo pmset -a standby 0
Warning: Idle sleep timings for "Battery Power" may not behave as expected.
- Disk sleep should be non-zero whenever system sleep is non-zero.
Warning: Idle sleep timings for "AC Power" may not behave as expected.
- Disk sleep should be non-zero whenever system sleep is non-zero.

$ sudo pmset -a autopoweroff 0
Warning: Idle sleep timings for "Battery Power" may not behave as expected.
- Disk sleep should be non-zero whenever system sleep is non-zero.
Warning: Idle sleep timings for "AC Power" may not behave as expected.
- Disk sleep should be non-zero whenever system sleep is non-zero.

$ sudo -k
```

Well, yeah, I'd suppose they won't.  Still, I'll have to try to keep this in mind.

Anyawy, I guess we'll see what happens.

#### Results

Seems to have worked.  Asleep for 8 hours, my MBA went from 100% to 86% while asleep, an expenditure of 14%.  That's fine for me, since basically any time it's at rest it's plugged in.  It does make it a bit less convenient on the go, of course, but nothing too terrible.  It is unfortunate however that I can't correct the root cause, whatever it might be.
