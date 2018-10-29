Making a USB Drive from an ISO on a Mac
=======================================

## Sources

1. An article with instructions on how to write an ISO to a USB drive: https://www.makeuseof.com/tag/how-to-boot-a-linux-live-usb-stick-on-your-mac/
2. Making an Ubuntu bootable USB drive on Mac: https://business.tutsplus.com/tutorials/how-to-create-a-bootable-ubuntu-usb-drive-for-mac-in-os-x--cms-21253
  1. Notably, they use APFS as the FS on the USB drive.  I guess it gets overwritten anyway in the `dd` step.
  2. However, they still use GUID as the scheme.  I wonder how much that matters, like, do you even need to do that?  I suppose it's the erasure part that's important.



## Instructions

As per [(Ss 1)](https://www.makeuseof.com/tag/how-to-boot-a-linux-live-usb-stick-on-your-mac/), you do these things:


### Formatting the USB Drive

1. In the Disk Utility app, first ensure that everything including the USB drive itself is visible by selecting **View > Show All Devices**.
2. Select the USB drive itself and tell Disk Utility to erase it:
  1. Give it a name, select FAT as the FS, and use GUID partitioning.
  2. Note the name down for later.


### Copying the ISO

First we have to convert the ISO to a DMG:

```sh
hdiutil convert /path/to/image.iso -format UDRW -o /path/to/image.dmg
```

> NOTE: Explicitly adding `.dmg` is not necessary in later versions of OS X, it gets appended automatically.

Next, we find the USB drive.

```sh
diskutil list
```

You should find an entry that looks something like this:

```
/dev/disk2 (external, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      GUID_partition_scheme                        *61.5 GB    disk2
   1:                        EFI EFI                     209.7 MB   disk2s1
   2:       Microsoft Basic Data THAT NAME               61.3 GB    disk2s2
```

Note down the Identifier, the top level one rather than the partitions.  In the above example outupt, it's `disk2`.

Then, unmount that disk:

```sh
diskutil unmountDisk /dev/diskN
```

Finally, copy the contents of the image over the USB disk, taking care to double check you're pointing at the right disk.

```sh
sudo dd if=/path/to/image.dmg of=/dev/diskN bs=1m
```

Once the command is finished, you can eject it.  As noted in [(Ss 2)](https://business.tutsplus.com/tutorials/how-to-create-a-bootable-ubuntu-usb-drive-for-mac-in-os-x--cms-21253), on older Macs, you might see a dialog box telling you the USB drive is corrupt or no longer readable.  Do not touch any of the buttons!  Instead, wait for the `dd` process to finish, then use `diskutil eject /dev/diskN`.
