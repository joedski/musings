Journal 2019-11-09 - Getting Started Building
========

I've got an idle interest in playing around with the original Diablo, even though the first one I actually played much of was DII for it-supports-Mac reasons.  However, there's a project called [DevilutionX][devilutionx] which is a cross-platform, public domain (!) reimplementation of the Diablo I engine.

Perhaps it'll be a good way to get back into more complex C++ stuff code?  Up until now I've just been playing with Arduino stuff which doesn't have nearly so complex of needs and is far more constrained.

There's also a chance I'll just not be able to understand anything.  But oh well!  That and I only see a very few issues labeled "Good First Issue".  We'll see.



## Enough Blather, Set Us Up The ~~Bomb~~ Devil

The instructions for building on OS X are ostensibly easy enough:

```
cd $devilutionx_dir
brew bundle
cd build
cmake ..
cmake --build . -j $(sysctl -n hw.physicalcpu)
```

> The `sysctl -n ...` command gets just the value of a given variable:
>
> > `-n`    Show only variable values, not their names.  This option is useful for setting shell variables.  ...

Ah, but to actually run it, you need a legit copy of the Diablo game data, which is not public domain...  Off to GOG it is.


### GOG: Installer vs Client

Installer or Client?  I think I'll go with the installer, I have enough random bullhocky installed on my computer.  Instead, I should install other, more esoteric bullhocky out of some misguided belief that it's better than GOG's.

This would turn out to be a small adventure.

I'd briefly read about how to actually run the darn thing, which requires `diabdat.mpq` be in the `devilutionx` install folder, but to do that you need to actually get that file...

Which is in the Setup exe file!  Which requires a tool innoextract to extract open it.  Sweet, I can just `brew install` that, right?  Right!  except that it's currently 1 version out of date, and doesn't support Inno Setup v5.6.2.


### Building innoextract From Source

Building it from source it is, then.  Surely that can't be too hard, right?

Well, no, but only if you already know what you're doing.

I got as far as downloading the source code archive for innoextract, extracting it, and running `cmake ..` in the `build` dir (that I had to create), but I ran into some configuration errors:

```
$ Boost_NO_BOOST_CMAKE=ON cmake ..

(successful checks omitted...)

CMake Warning at /usr/local/lib/cmake/boost_iostreams-1.71.0/libboost_iostreams-variant-shared.cmake:59 (message):
  Target Boost::iostreams already has an imported location
  '/usr/local/lib/libboost_iostreams-mt.dylib', which will be overwritten
  with '/usr/local/lib/libboost_iostreams.dylib'
Call Stack (most recent call first):
  /usr/local/lib/cmake/boost_iostreams-1.71.0/boost_iostreams-config.cmake:43 (include)
  /usr/local/lib/cmake/Boost-1.71.0/BoostConfig.cmake:117 (find_package)
  /usr/local/lib/cmake/Boost-1.71.0/BoostConfig.cmake:182 (boost_find_component)
  /usr/local/Cellar/cmake/3.15.5/share/cmake/Modules/FindBoost.cmake:443 (find_package)
  CMakeLists.txt:172 (find_package)


(... repeated 4 times for other things.)


-- Found Boost: /usr/local/lib/cmake/Boost-1.71.0/BoostConfig.cmake (found version "1.71.0") found components:  iostreams filesystem date_time system program_options 
-- Checking Boost: Boost::iostreams;Boost::filesystem;Boost::date_time;Boost::system;Boost::program_options
CMake Error at /.../DevilutionX/innoextract-1.8/build/CMakeFiles/CMakeTmp/CMakeLists.txt:16 (add_executable):
  Target "cmTC_53033" links to target "Boost::iostreams" but the target was
  not found.  Perhaps a find_package() call is missing for an IMPORTED
  target, or an ALIAS target is missing?


(... repeated 4 times for other things.)


CMake Error at cmake/CompileCheck.cmake:202 (try_compile):
  Failed to generate test project build system.
Call Stack (most recent call first):
  cmake/CompileCheck.cmake:246 (try_link_library)
  CMakeLists.txt:179 (check_link_library)


-- Configuring incomplete, errors occurred!
See also ".../DevilutionX/innoextract-1.8/build/CMakeFiles/CMakeOutput.log".
```

Hm.  A bit of googlefu eventually led to [a Stackoverflow answer](https://stackoverflow.com/a/58085634), which itself led to [an issue on `boost_install`](https://github.com/boostorg/boost_install/issues/13).  But, basically, define `Boost_NO_BOOST_CMAKE=ON`.  But where?

Env var?

```
$ Boost_NO_BOOST_CMAKE=ON cmake ..

(...same errors as first time)
```

Okay, no dice there.

Does cmake have any variable definition thing?

```
$ cmake --help
Usage

  cmake [options] <path-to-source>
  cmake [options] <path-to-existing-build>
  cmake [options] -S <path-to-source> -B <path-to-build>

Specify a source directory to (re-)generate a build system for it in the
current working directory.  Specify an existing build directory to
re-generate its build system.

Options
  (... options)
  -D <var>[:<type>]=<value>    = Create or update a cmake cache entry.
  (... more options)
```

That's the only assigny thingy I see, so I'll try that.

```
$ cmake -D Boost_NO_BOOST_CMAKE=ON ..

(... success output)

Configuration:
 - Build type: Release
 - ARC4 decryption: enabled
 - LZMA decompression: enabled
 - File time precision: nanoseconds
 - Charset conversion: iconv, builtin

-- Configuring done
-- Generating done
-- Build files have been written to: /.../innoextract-1.8/build
```

Ah, excellent.  Now I can just `make` and `make install`.

And did it work...?

```
$ innoextract --help
Usage: innoextract [options] <setup file(s)>

Extract files from an Inno Setup installer.
For multi-part installers only specify the exe file.

(... options)

Extracts installers created by Inno Setup 1.2.10 to 6.0.2

innoextract 1.8 (C) 2011-2019 Daniel Scharrer <daniel@constexpr.org>
This is free software with absolutely no warranty.
```

Yes!


### Extraction!

Now I can extract to my heart's content:

```
$ innoextract --extract ../setup_diablo_1.09_hellfire_v2_\(30038\).exe
(... files!)
```



## Actually Building DevilutionX

First off, if because I uninstalled and reinstalled and shuffled a few things around while running around like a headless chicken with innoextract, I need to rerun the `cmake ..` step before the `cmake --build . -j $(sysctl -n hw.physicalcpu)` step, but otherwise it seems to work fine?



## Actually Running The Whole Shebang

> Summary: Both items have to go into `/Applications/`.  Must be a hardcoded path for now, rather than "in the same folder as the app bundle".  Whatever, that means I can run it, which is important.

Now the question is, it built an `.app` bundle... where do I put `diabdat.mpq`?  Next to `devilutionx.app/Contents/MacOS/devilutionx`?  Next to `devilution.app` itself?  Somewhere else?

Guess I'll try each one in turn.

- `devilutionx.app/Contents/MacOS/diabdat.mpq` - Nope!
- `devilutionx.app/Contents/Resources/diabdat.mpq` - Nope!
- `devilutionx.app/../` (same folder as app bundle) - Nope?  But [this issue](https://github.com/diasurgical/devilutionX/issues/320) seems to imply that would be the correct location...

Hm.  [This comment on another issue](https://github.com/diasurgical/devilutionX/issues/145#issuecomment-510390327) indicates that the file itself might not be right, but `AJenbo` says that the EU/Mac/GoG `diabdat.mpq`'s md5 is `011bc6518e6166206231080a4440b373`, and mine matches that, so it's probably the right file.  Hm.

I also tried launching from Finder, since I was using `open devilutionx.app` before, but same result.

One thing I noticed is that [everyone's giving it permissions of 777](https://github.com/diasurgical/devilutionX/issues/145#issuecomment-510274264).  Maybe due to [this remark about stormlib needing "right" (write?) permission?](https://github.com/diasurgical/devilutionX/issues/145#issuecomment-508886992)  Lemme try a bit of `chmod ugo+w` on it...

Still no luck.  Also tried `ugo+x` but that didn't make a difference either.  Hm.

So, where'm I at right now?

```
$ ls -l
(...)
drwxr-xr-x   3 me!  staff         96 Nov  9 21:14 devilutionx.app
-rw-rw-rw-   1 me!  staff  517501282 Nov  9 21:22 diabdat.mpq
```

Hmmmmmmmmmmmmmmmmm.

Getting desparate, now.  Maybe if I put everything in my user Applications folder?

Well I'll be, there it goes.  Not sure what that means for testing stuff, but the first step is running the darn thing, and I've gotten there.



## Initial Issues

So, it loads, plays the opening cinematic, goes to the menu, lets me start!

Only immediate issue I see is that in the actual game play loop the cursor graphic doesn't seem to be updating on screen until I click.  Gonna take a look at if there's any issues about this, first.

Other possible things to checkout: SDL, Mac Catalina/10.15 ... and, uh, yeah.

Also, how do you run it with debug output?

Build with `DEBUG=ON` I think.  [Possibly `FASTER=ON`](https://github.com/diasurgical/devilutionX/issues/254#issuecomment-531976854) to skip some animations if I'm just trying to debug things.

I decided to try setting both `DEBUG=ON` and `FASTER=ON`:

```
cmake -D DEBUG=ON -D FASTER=ON ..
cmake --build . -j $(sysctl -n hw.physicalcpu)
```

At least I think that's how to do it.  It did seem to result in a different build log, with some extra warnings popping up.

<details>
<summary>Build Log Output</summary>

```
$  cmake --build . -j $(sysctl -n hw.physicalcpu)
Scanning dependencies of target smacker
Scanning dependencies of target PKWare
Scanning dependencies of target StormLib
Scanning dependencies of target devilution
[  0%] Building CXX object CMakeFiles/PKWare.dir/3rdParty/PKWare/explode.cpp.o
[  0%] Building C object CMakeFiles/smacker.dir/3rdParty/libsmacker/smk_bitstream.c.o
[  1%] Building CXX object CMakeFiles/StormLib.dir/3rdParty/StormLib/src/FileStream.cpp.o
[  2%] Building C object CMakeFiles/smacker.dir/3rdParty/libsmacker/smk_hufftree.c.o
[  3%] Building CXX object CMakeFiles/PKWare.dir/3rdParty/PKWare/implode.cpp.o
[  4%] Building C object CMakeFiles/smacker.dir/3rdParty/libsmacker/smacker.c.o
[  5%] Linking CXX static library libPKWare.a
[  5%] Building CXX object CMakeFiles/StormLib.dir/3rdParty/StormLib/src/SBaseCommon.cpp.o
[  5%] Built target PKWare
[  6%] Building CXX object CMakeFiles/StormLib.dir/3rdParty/StormLib/src/SBaseFileTable.cpp.o
[  7%] Linking C static library libsmacker.a
[  7%] Built target smacker
[  8%] Building CXX object CMakeFiles/StormLib.dir/3rdParty/StormLib/src/SBaseSubTypes.cpp.o
Scanning dependencies of target Radon
[  9%] Building CXX object CMakeFiles/StormLib.dir/3rdParty/StormLib/src/SCompression.cpp.o
[  9%] Building CXX object CMakeFiles/Radon.dir/3rdParty/Radon/Radon/source/File.cpp.o
[  9%] Building CXX object CMakeFiles/StormLib.dir/3rdParty/StormLib/src/SFileExtractFile.cpp.o
[ 10%] Building CXX object CMakeFiles/Radon.dir/3rdParty/Radon/Radon/source/Key.cpp.o
[ 11%] Building CXX object CMakeFiles/StormLib.dir/3rdParty/StormLib/src/SFileFindFile.cpp.o
[ 12%] Building CXX object CMakeFiles/StormLib.dir/3rdParty/StormLib/src/SFileGetFileInfo.cpp.o
[ 13%] Building CXX object CMakeFiles/devilution.dir/Source/appfat.cpp.o
[ 13%] Building CXX object CMakeFiles/StormLib.dir/3rdParty/StormLib/src/SFileOpenArchive.cpp.o
[ 14%] Building CXX object CMakeFiles/StormLib.dir/3rdParty/StormLib/src/SFileOpenFileEx.cpp.o
[ 15%] Building CXX object CMakeFiles/devilution.dir/Source/automap.cpp.o
[ 16%] Building CXX object CMakeFiles/StormLib.dir/3rdParty/StormLib/src/SFileReadFile.cpp.o
[ 16%] Linking CXX static library libStormLib.a
[ 16%] Built target StormLib
[ 17%] Building CXX object CMakeFiles/Radon.dir/3rdParty/Radon/Radon/source/Named.cpp.o
[ 17%] Building CXX object CMakeFiles/Radon.dir/3rdParty/Radon/Radon/source/Section.cpp.o
[ 17%] Building CXX object CMakeFiles/devilution.dir/Source/capture.cpp.o
[ 18%] Building CXX object CMakeFiles/devilution.dir/Source/codec.cpp.o
[ 19%] Building CXX object CMakeFiles/devilution.dir/Source/control.cpp.o
[ 20%] Linking CXX static library libRadon.a
[ 20%] Built target Radon
[ 21%] Building CXX object CMakeFiles/devilution.dir/Source/cursor.cpp.o
[ 21%] Building CXX object CMakeFiles/devilution.dir/Source/dead.cpp.o
[ 22%] Building CXX object CMakeFiles/devilution.dir/Source/debug.cpp.o
[ 23%] Building CXX object CMakeFiles/devilution.dir/Source/diablo.cpp.o
[ 23%] Building CXX object CMakeFiles/devilution.dir/Source/doom.cpp.o
[ 24%] Building CXX object CMakeFiles/devilution.dir/Source/drlg_l1.cpp.o
[ 25%] Building CXX object CMakeFiles/devilution.dir/Source/drlg_l2.cpp.o
[ 25%] Building CXX object CMakeFiles/devilution.dir/Source/drlg_l3.cpp.o
[ 26%] Building CXX object CMakeFiles/devilution.dir/Source/drlg_l4.cpp.o
[ 27%] Building CXX object CMakeFiles/devilution.dir/Source/dthread.cpp.o
[ 28%] Building CXX object CMakeFiles/devilution.dir/Source/effects.cpp.o
[ 28%] Building CXX object CMakeFiles/devilution.dir/Source/encrypt.cpp.o
[ 29%] Building CXX object CMakeFiles/devilution.dir/Source/engine.cpp.o
[ 30%] Building CXX object CMakeFiles/devilution.dir/Source/error.cpp.o
[ 30%] Building CXX object CMakeFiles/devilution.dir/Source/gamemenu.cpp.o
[ 31%] Building CXX object CMakeFiles/devilution.dir/Source/gendung.cpp.o
[ 32%] Building CXX object CMakeFiles/devilution.dir/Source/gmenu.cpp.o
[ 32%] Building CXX object CMakeFiles/devilution.dir/Source/help.cpp.o
[ 33%] Building CXX object CMakeFiles/devilution.dir/Source/init.cpp.o
[ 34%] Building CXX object CMakeFiles/devilution.dir/Source/interfac.cpp.o
[ 34%] Building CXX object CMakeFiles/devilution.dir/Source/inv.cpp.o
[ 35%] Building CXX object CMakeFiles/devilution.dir/Source/itemdat.cpp.o
[ 36%] Building CXX object CMakeFiles/devilution.dir/Source/items.cpp.o
[ 37%] Building CXX object CMakeFiles/devilution.dir/Source/lighting.cpp.o
[ 37%] Building CXX object CMakeFiles/devilution.dir/Source/loadsave.cpp.o
[ 38%] Building CXX object CMakeFiles/devilution.dir/Source/mainmenu.cpp.o
[ 39%] Building CXX object CMakeFiles/devilution.dir/Source/minitext.cpp.o
[ 39%] Building CXX object CMakeFiles/devilution.dir/Source/misdat.cpp.o
[ 40%] Building CXX object CMakeFiles/devilution.dir/Source/missiles.cpp.o
[ 41%] Building CXX object CMakeFiles/devilution.dir/Source/monstdat.cpp.o
[ 41%] Building CXX object CMakeFiles/devilution.dir/Source/monster.cpp.o
[ 42%] Building CXX object CMakeFiles/devilution.dir/Source/movie.cpp.o
[ 43%] Building CXX object CMakeFiles/devilution.dir/Source/mpqapi.cpp.o
[ 43%] Building CXX object CMakeFiles/devilution.dir/Source/msg.cpp.o
[ 44%] Building CXX object CMakeFiles/devilution.dir/Source/multi.cpp.o
[ 45%] Building CXX object CMakeFiles/devilution.dir/Source/nthread.cpp.o
[ 46%] Building CXX object CMakeFiles/devilution.dir/Source/objdat.cpp.o
[ 46%] Building CXX object CMakeFiles/devilution.dir/Source/objects.cpp.o
[ 47%] Building CXX object CMakeFiles/devilution.dir/Source/pack.cpp.o
[ 48%] Building CXX object CMakeFiles/devilution.dir/Source/palette.cpp.o
[ 48%] Building CXX object CMakeFiles/devilution.dir/Source/path.cpp.o
[ 49%] Building CXX object CMakeFiles/devilution.dir/Source/pfile.cpp.o
[ 50%] Building CXX object CMakeFiles/devilution.dir/Source/player.cpp.o
[ 50%] Building CXX object CMakeFiles/devilution.dir/Source/plrmsg.cpp.o
[ 51%] Building CXX object CMakeFiles/devilution.dir/Source/portal.cpp.o
[ 52%] Building CXX object CMakeFiles/devilution.dir/Source/spelldat.cpp.o
[ 53%] Building CXX object CMakeFiles/devilution.dir/Source/quests.cpp.o
[ 53%] Building CXX object CMakeFiles/devilution.dir/Source/render.cpp.o
[ 54%] Building CXX object CMakeFiles/devilution.dir/Source/restrict.cpp.o
[ 55%] Building CXX object CMakeFiles/devilution.dir/Source/scrollrt.cpp.o
[ 55%] Building CXX object CMakeFiles/devilution.dir/Source/setmaps.cpp.o
[ 56%] Building CXX object CMakeFiles/devilution.dir/Source/sha.cpp.o
[ 57%] Building CXX object CMakeFiles/devilution.dir/Source/spells.cpp.o
[ 57%] Building CXX object CMakeFiles/devilution.dir/Source/stores.cpp.o
[ 58%] Building CXX object CMakeFiles/devilution.dir/Source/sync.cpp.o
[ 59%] Building CXX object CMakeFiles/devilution.dir/Source/textdat.cpp.o
[ 59%] Building CXX object CMakeFiles/devilution.dir/Source/themes.cpp.o
[ 60%] Building CXX object CMakeFiles/devilution.dir/Source/tmsg.cpp.o
[ 61%] Building CXX object CMakeFiles/devilution.dir/Source/town.cpp.o
[ 62%] Building CXX object CMakeFiles/devilution.dir/Source/towners.cpp.o
[ 62%] Building CXX object CMakeFiles/devilution.dir/Source/track.cpp.o
[ 63%] Building CXX object CMakeFiles/devilution.dir/Source/trigs.cpp.o
[ 64%] Building CXX object CMakeFiles/devilution.dir/Source/wave.cpp.o
[ 64%] Linking CXX static library libdevilution.a
[ 64%] Built target devilution
Scanning dependencies of target devilutionx
[ 65%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/controls/devices/joystick.cpp.o
[ 67%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/controls/devices/kbcontroller.cpp.o
[ 67%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/dx.cpp.o
[ 67%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/controls/devices/game_controller.cpp.o
[ 68%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/controls/controller.cpp.o
[ 68%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/controls/controller_motion.cpp.o
[ 69%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/controls/game_controls.cpp.o
[ 70%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/controls/menu_controls.cpp.o
[ 71%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/controls/plrctrls.cpp.o
In file included from /.../DevilutionX/devilutionX/SourceX/controls/game_controls.cpp:10:
/.../DevilutionX/devilutionX/SourceX/controls/plrctrls.h:8:1: warning: typedef requires a name
      [-Wmissing-declarations]
typedef enum belt_item_type {
^~~~~~~
In file included from /.../DevilutionX/devilutionX/SourceX/controls/plrctrls.cpp:1:
/.../DevilutionX/devilutionX/SourceX/controls/plrctrls.h:8:1: warning: typedef requires a name
      [-Wmissing-declarations]
typedef enum belt_item_type {
^~~~~~~
/.../DevilutionX/devilutionX/SourceX/controls/plrctrls.cpp:588:52: warning: array subscript is of type
      'char' [-Wchar-subscripts]
                NetSendCmdLocParam1(pcurs, CMD_GOTOAGETITEM, item[pcursitem]._ix, item[pcursitem]._iy, pcursitem);
                                                                 ^~~~~~~~~~
/.../DevilutionX/devilutionX/SourceX/controls/plrctrls.cpp:588:73: warning: array subscript is of type
      'char' [-Wchar-subscripts]
                NetSendCmdLocParam1(pcurs, CMD_GOTOAGETITEM, item[pcursitem]._ix, item[pcursitem]._iy, pcursitem);
                                                                                      ^~~~~~~~~~
/.../DevilutionX/devilutionX/SourceX/controls/plrctrls.cpp:590:88: warning: array subscript is of type
      'char' [-Wchar-subscripts]
  ...NetSendCmdLocParam1(true, pcurs == CURSOR_DISARM ? CMD_DISARMXY : CMD_OPOBJXY, object[pcursobj]._ox, object[pcursob...
                                                                                          ^~~~~~~~~
/.../DevilutionX/devilutionX/SourceX/controls/plrctrls.cpp:590:110: warning: array subscript is of type
      'char' [-Wchar-subscripts]
  ...pcurs == CURSOR_DISARM ? CMD_DISARMXY : CMD_OPOBJXY, object[pcursobj]._ox, object[pcursobj]._oy, pcursobj);
                                                                                      ^~~~~~~~~
[ 71%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/miniwin/ddraw.cpp.o
1 warning generated.
[ 72%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/miniwin/misc.cpp.o
[ 73%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/miniwin/misc_io.cpp.o
5 warnings generated.
[ 73%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/miniwin/misc_msg.cpp.o
[ 74%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/miniwin/rand.cpp.o
[ 75%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/miniwin/thread.cpp.o
In file included from /.../DevilutionX/devilutionX/SourceX/miniwin/misc_msg.cpp:10:
/.../DevilutionX/devilutionX/SourceX/controls/plrctrls.h:8:1: warning: typedef requires a name
      [-Wmissing-declarations]
typedef enum belt_item_type {
^~~~~~~
[ 75%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/miniwin/dsound.cpp.o
1 warning generated.
[ 76%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/sound.cpp.o
[ 77%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/storm/storm.cpp.o
[ 78%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/storm/storm_net.cpp.o
[ 78%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/storm/storm_dx.cpp.o
[ 79%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/dvlnet/abstract_net.cpp.o
[ 80%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/dvlnet/loopback.cpp.o
[ 80%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/dvlnet/packet.cpp.o
[ 81%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/dvlnet/base.cpp.o
[ 82%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/dvlnet/frame_queue.cpp.o
[ 82%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/dvlnet/cdwrap.cpp.o
[ 83%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/art_draw.cpp.o
[ 84%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/errorart.cpp.o
[ 84%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/art.cpp.o
[ 85%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/button.cpp.o
[ 86%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/credits.cpp.o
[ 87%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/credits_lines.cpp.o
[ 87%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/diabloui.cpp.o
[ 88%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/dialogs.cpp.o
[ 89%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/fonts.cpp.o
[ 89%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/mainmenu.cpp.o
/.../DevilutionX/devilutionX/SourceX/DiabloUI/dialogs.cpp:62:8: warning: unused variable 'PROGRESS_DIALOG'
      [-Wunused-variable]
UiItem PROGRESS_DIALOG[] = {
       ^
/.../DevilutionX/devilutionX/SourceX/DiabloUI/dialogs.cpp:72:8: warning: unused variable 'SELOK_DIALOG'
      [-Wunused-variable]
UiItem SELOK_DIALOG[] = {
       ^
/.../DevilutionX/devilutionX/SourceX/DiabloUI/dialogs.cpp:77:8: warning: unused variable 'SPAWNERR_DIALOG'
      [-Wunused-variable]
UiItem SPAWNERR_DIALOG[] = {
       ^
3 warnings generated.
[ 90%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/progress.cpp.o
[ 91%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/scrollbar.cpp.o
[ 91%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/selconn.cpp.o
[ 92%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/selgame.cpp.o
[ 93%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/selhero.cpp.o
[ 93%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/selyesno.cpp.o
[ 94%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/text_draw.cpp.o
[ 95%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/text.cpp.o
[ 96%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/title.cpp.o
[ 96%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/DiabloUI/ttf_render_wrapped.cpp.o
[ 97%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/main.cpp.o
[ 98%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/dvlnet/tcp_client.cpp.o
[ 98%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/dvlnet/tcp_server.cpp.o
[ 99%] Building CXX object CMakeFiles/devilutionx.dir/SourceX/dvlnet/udp_p2p.cpp.o
Copying OS X content devilutionx.app/Contents/Resources/AppIcon.icns
Copying OS X content devilutionx.app/Contents/Resources/CharisSILB.ttf
[100%] Linking CXX executable devilutionx.app/Contents/MacOS/devilutionx
[100%] Built target devilutionx
```

</details>

guess I just have to see if it's outputting anything, then.

Okay, the cursor is now just working fine...?

Just to double check, I opened the first build and that's working fine, too.  So, that leaves external factors: what might have been going on outside of the game that could affect it?

The only difference as far as I can tell is that I had a Twitch stream open in Firefox.  It's not out of the question that that could affect things, but it seems quite strange.

I guess the next thing is to see if I can run it with a debugger active.  Hm.  Use CMake to make an XCode project?  That was listed as a target.

[devilutionx]: https://github.com/diasurgical/devilutionX
