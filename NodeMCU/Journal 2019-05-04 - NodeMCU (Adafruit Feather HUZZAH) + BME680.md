Journal 2019-05-04 - NodeMCU (Adafruit Feather HUZZAH) + BME680
===============================================================

Time to actually sense some data!  Conveniently, NodeMCU comes with a BME680 module... but it was added in 2017, so I'll need to update things.

As a quick note: I don't need VOC metering yet, and I don't have a callibrated source anyway, so I'm ignoring that for now.



## Trying Out the Example Code

This is (more or less) the example code from [the docs](https://nodemcu.readthedocs.io/en/master/modules/bme680/):

```lua
-- Value pulled from their tutorial.
-- I should probably look up how to find it some time.
alt = 320
-- Set to the (physical!) pins labeled SDA and SCL.
sda, scl = 13, 14
i2c.setup(0, sda, scl, i2c.SLOW)
bme680.setup()

handleReadout = function ()
    T, P, H, G, QNH = bme680.read(alt)
    if T then
        local Tsgn = (T < 0 and -1 or 1); T = Tsgn*T
        print(string.format("T=%s%d.%02d", Tsgn<0 and "-" or "", T/100, T%100))
        print(string.format("QFE=%d.%03d", P/100, P%100))
        print(string.format("QNH=%d.%03d", QNH/100, QNH%100))
        print(string.format("humidity=%d.%03d%%", H/1000, H%1000))
        print(string.format("gas resistance=%d", G))
        D = bme680.dewpoint(H, T)
        local Dsgn = (D < 0 and -1 or 1); D = Dsgn*D
        print(string.format("dew_point=%s%d.%02d", Dsgn<0 and "-" or "", D/100, D%100))
    end
end

bme680.startreadout(150, handleReadout)
```

```
> bme680.startreadout(150, handleReadout)
> 
 ets Jan  8 2013,rst cause:2, boot mode:(3,6)

load 0x40100000, len 27688, room 16 
tail 8
chksum 0xf7
load 0x3ffe8000, len 2464, room 0 
tail 0
chksum 0xfd
load 0x3ffe89a0, len 136, room 8 
tail 0
chksum 0x95
csum 0x95
(non-ASCII stuff omitted)

NodeMCU custom build by frightanic.com
        branch: master
        commit: 4905381c004bdeaf744a60bb940c1906c2e052d4
        SSL: true
        modules: bme680,crypto,file,gpio,i2c,net,node,sjson,tmr,uart,wifi,tls
 build created on 2019-05-05 02:45
 powered by Lua 5.1.4 on SDK 2.2.1(6ab97e9)
hello!
> 
```

Erf.  Didn't set `alt`...  Or, that wasn't it.  Hm.

Oh, oops.  I used the pin numbers printed on the board, not the [physical pin numbers](https://learn.adafruit.com/assets/46249).  The former give 4 as SDA, and 5 as SCL; those should be ~~13 as SDA and 14 as SCL~~ [2 as SDA and 1 as SCL](https://nodemcu.readthedocs.io/en/master/modules/gpio/).  Herp.

> NOTE: [According to Adafruit](https://learn.adafruit.com/adafruit-feather-huzzah-esp8266/using-nodemcu-lua), the ESP8266 docs have GPIO pins 4 and 5 reversed with respect to the IO index, hence why [the NodeMCU docs](https://nodemcu.readthedocs.io/en/master/modules/gpio/) say "GPIO 5 -> IO 1" and "GPIO 4 -> IO 2".  [Everywhere else](https://github.com/esp8266/Arduino/issues/584) seems to agree with the NodeMCU docs?  Hm.  I'll just have to try one then the other.  Bluh.

Here, I'll try this as a module:

```lua
-- application.lua
-- uses 'i2c' and 'bme680'
local M = {}

-- Value pulled from their tutorial.
-- I should probably look up how to find it some time.
M.alt = 320
-- Set to the (nodemcu-lua!) pins labeled SDA and SCL.
-- GPIO4 -> IO2, GPIO5 -> IO1
-- https://nodemcu.readthedocs.io/en/master/modules/gpio/
-- https://github.com/esp8266/Arduino/issues/584
M.sda, M.scl = 2, 1

function M.init()
  i2c.setup(0, M.sda, M.scl, i2c.SLOW)
  bme680.setup()
end

function M.handlereadout()
  local T, P, H, G, QNH = bme680.read(M.alt)
  if T then
    local Tsgn = (T < 0 and -1 or 1); T = Tsgn*T
    print(string.format("T=%s%d.%02d", Tsgn<0 and "-" or "", T/100, T%100))
    print(string.format("QFE=%d.%03d", P/100, P%100))
    print(string.format("QNH=%d.%03d", QNH/100, QNH%100))
    print(string.format("humidity=%d.%03d%%", H/1000, H%1000))
    print(string.format("gas resistance=%d", G))
    local D = bme680.dewpoint(H, T)
    local Dsgn = (D < 0 and -1 or 1); D = Dsgn*D
    print(string.format("dew_point=%s%d.%02d", Dsgn<0 and "-" or "", D/100, D%100))
  end
end

function M.startreadout()
  bme680.startreadout(150, M.handlereadout)
end

return M
```

And of course, `init.lua`:

```lua
-- init.lua
-- NOTE: not `local`!
application = require "application"
```

The result:

```
> application.init()
> application.startreadout()
T=24.57
QFE=981.077
QNH=1019.087
humidity=55.220%
gas resistance=535
dew_point=15.01
```

It works!  The sensor read 24.57°C/55%, while my other two thermometers read 23.5°C/50% and 23.8°C/54%.  There's always been quite a spread between units on relative humidity.  I don't have a separate barometer, so those readings are on their own.  The temperature reading is a good degree C above the separate units, though.  Not sure what's up with that.  Maybe it's too high, maybe one of the other units is too low, and one's smack-dab in the middle?  Can't tell without a good reference.
