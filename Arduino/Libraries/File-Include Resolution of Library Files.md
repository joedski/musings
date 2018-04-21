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


### Results

... pending!
