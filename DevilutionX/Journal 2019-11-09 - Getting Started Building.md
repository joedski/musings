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
CMake Error at /Users/Joe/Documents/DevilutionX/innoextract-1.8/build/CMakeFiles/CMakeTmp/CMakeLists.txt:16 (add_executable):
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
See also "/Users/Joe/Documents/DevilutionX/innoextract-1.8/build/CMakeFiles/CMakeOutput.log".
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

[devilutionx]: https://github.com/diasurgical/devilutionX
