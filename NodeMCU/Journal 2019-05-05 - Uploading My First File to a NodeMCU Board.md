Journal 2019-05-05 - Uploading My First File to a NodeMCU Board
===============================================================

Here, using an Adafruit Feather HUZZAH, which has an ESP-12!



## Installing Tools


### Installing esptool.py

I have my bashrc setup such that `PIP_REQUIRE_VIRTUALENV=true` is defined, so in order to install things with `pip`, I need to do `pip --isolated`.  This is intentional!

Ultimately, the full command was:

```sh
pip install --user --isolated esptool
```

It doesn't tell you where things are located, but I ended up having to google things anyway.  Eventually, I came across this as a solution, and added it to my bash stuff:

```sh
# OS X ships with python 2.7.
PYTHON_2_USER_BASE=$(python -c 'import site; print(site.USER_BASE)')
export PATH="${PATH}:${PYTHON_2_USER_BASE}/bin"

# Python 3.x had to be installed separately.
if which python3 > /dev/null; then
  PYTHON_3_USER_BASE=$(python3 -c 'import site; print(site.USER_BASE)')
  export PATH="${PATH}:${PYTHON_3_USER_BASE}/bin"
fi
```

That squared away, I could finally flash the darn thing!

```sh
ESP_SERIAL_PORT=/dev/tty.SLAB_USBtoUART

# Upgrading, need to erase everything first
esptool.py --port $ESP_SERIAL_PORT erase_flash

# -fm dio for ESP-12
esptool.py --port $ESP_SERIAL_PORT write_flash -fm dio 0x00000 ./nodemcu_master_asdf-asdf_float.bin
```


### Uploading Things

Flashing went fine, now I just need to upload something.  There were [a number of proposed tools](https://nodemcu.readthedocs.io/en/master/upload/), and I decided to use [nodemcu-tool](https://github.com/andidittrich/NodeMCU-Tool), a Node JS uploader for NodeMCU stuff.  Not confusing in the least.

> Also, turns out NodeMCU uses just `\n` in Lua land itself.  Yay, no need to convert file line-endings!

First, my spiffing new file:

```lua
print('hello!')
```

Then, to upload:

```sh
ESP_SERIAL_PORT=/dev/tty.SLAB_USBtoUART

nodemcu-tool --port $ESP_SERIAL_PORT upload init.lua
```

```
[NodeMCU-Tool]~ Connected 
[device]      ~ Arch: esp8266 | Version: 2.2.0 | ChipID: 0x1a6d02 | FlashID: 0x16405e 
[NodeMCU-Tool]~ Uploading "init.lua" >> "init.lua"... 
[connector]   ~ Transfer-Mode: hex 
[NodeMCU-Tool]~ File Transfer complete! 
[NodeMCU-Tool]~ disconnecting 
```

Finally, `screen`ing in and rebooting the unit:

```
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

Excellent.
