Journal 2019-05-04 - NodeMCU (Adafruit Feather HUZZAH) + BME680
===============================================================

Time to actually sense some data!  Conveniently, NodeMCU comes with a BME680 module... but it was added in 2017, so I'll need to update things.

As a quick note: I don't need VOC metering yet, and I don't have a callibrated source anyway, so I'm ignoring that for now.



## Trying Out the Example Code

```lua
alt = 320
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

Oh, oops.  I used the pin numbers printed on the board, not the physical pin number.  The former give 4 as SDA, and 5 as SCL; those should be 13 as SDA and 14 as SCL.  Herp.
