File-Include Resolution of Library Files When Working With Arduino
==================================================================

I'm probably over thinking things because GCC has been around for quite some time and is very schmott, but I do wonder if it's just that all files are included from a library folder or if you can name specific ones or what.  Or maybe only one file is includable, and it has to match the folder name?


### Methodology

I imagine this can be easily tested like so:

- Create library folder `libraries/JoeDSki_IncludeTest` (because I'm a good citizen and namespace things properly.)
- Smoke Test:
  - Create files `libraries/JoeDSki_IncludeTest/JoeDSki_IncludeTest.{h,cpp}` with a simple function or class or something defined and implemented.
  - These should be includable as expected:
    - `#include <JoeDSki_IncludeTest.h>`
- Other Test:
  - Create files `libraries/JoeDSki_IncludeTest/JoeDSki_IncludeTest_OtherFile.{h,cpp}` with a different simple definition and implementation.
  - Try including that file, too:
    - `#include <JoeDSki_IncludeTest_OtherFile.h>`
- Subdir Test:
  - Create file `libraries/JoeDSki_IncludeTest/JoeDSki_LUTs/Sine.h`.
  - Try including that file, too:
    - `#include <JoeDSki_LUTs/Sine.h>`


### Results

The _Smoke Test_ worked about as expected, no errors during compilation, although I had to restart the Arduino IDE after creating the new folder in `libraries`.  I guess it scans on startup and never rescans.

The _Other Test_ also seemed to work, so it seems you can include any file in a folder within `libraries`.  Again, I had to restart the Arduino IDE, but this shouldn't be a problem unless I'm actively developing on a library.

This is good for if I want to break the library up into smaller targeted file.  Of course, I should probably include an omnibus file, too.

The _Subdir Test_ also works.  Excellent.  It should probably be called `sineTable.h` but whatever.
