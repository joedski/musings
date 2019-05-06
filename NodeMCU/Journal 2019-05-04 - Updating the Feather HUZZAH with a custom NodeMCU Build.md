Journal 2019-05-04 - Updating the Feather HUZZAH with a custom NodeMCU Build
========

1. NodeMCU Stuff:
    1. Building the Firmware:
        1. [NodeMCU Custom Builds](https://nodemcu-build.com/index.php)
        2. [BME680 Module](https://nodemcu.readthedocs.io/en/master/modules/bme680/)
        3. [NodeMCU Docs on Building the Firmware](https://nodemcu.readthedocs.io/en/master/build/)
        4. [nodemcu-build Docker Image](https://hub.docker.com/r/marcelstoer/nodemcu-build/) for running the builder in Docker
    2. Flashing the Firmware:
        1. [Instructions from NodeMCU Docs](https://nodemcu.readthedocs.io/en/master/flash/)
        2. [`esptool` from Espressif](https://github.com/espressif/esptool)



## Modules for Environment Data Logging

Some Board-Specific Notes:

- The Adafruit Feather HUZZAH was detected by `esptool.py` as having 4MB Flash.

Modules to Include:

> I left all the default ones, merely adding the ones I needed atop those.

- bme680
- crypto
- file
- gpio
- http
- i2c
- net
- node
- sjson
- timer
- uart
- wifi

Modules not in the Builder:

> I'm going to not include these in the initial build because I want to get started sooner than later playing with the BME680.  I'll need to do it before too long, though.

- [mdns client](https://github.com/udaygin/nodemcu-mdns-client)

Other Options:

- LFS Stuff:
    - Skipping for now, but the Feather HUZZAH has 4MB flash on it.  MegabYtes.  I could probably stuff all I want in here...
- TLS/SSL Support



## Flashing the Board

- Short Pin #0 to GND before powering on board.
- Connect board.
- Optional: Determine flash capacity:
    - `esptool.py --port $ESP_SERIAL_PORT flash_id`
    - Compare manufacturer/device codes against a list of manufacturer/model names
    - Search that combination in `$SEARCH_ENGINE`
- Optional: Completely erase flash: `esptool.py --port $ESP_SERIAL_PORT erase_flash`
    - Can help if there are weird things happening on boot up after flashing.
    - Usually good to do if upgrading, which given that my board started with a 2015 build...
- Flash the flash: `esptool.py --port $ESP_SERIAL_PORT write_flash -fm $ESP_FLASH_MODE 0x00000 $ESP_FIRMWARE_BIN`
    - `ESP_FLASH_MODE` is `qio`, `dio`, or `dout`.
        - For ESP-12 (Flash >= 4MB), use `dio`.

For my first time flashing, I think I'll do this:

```sh
ESP_SERIAL_PORT=/dev/tty.SLAB_USBtoUART

esptool.py --port $ESP_SERIAL_PORT erase_flash
esptool.py --port $ESP_SERIAL_PORT write_flash -fm dio 0x00000 ./nodemcu_master_asdf-asdf_float.bin
```

Subsequent flashes shouldn't require the `erase_flash` command.
