Journal 2019-11-15 - Running With a Debugger
========

So, I think there's two main options for debugging, and I'm not even remotely experienced with either to know what's better:

1. Xcode - Requires a project.  CMake can make an Xcode target, though.
2. gdb - ????

Given the above arguments, I think I'll try Xcode first.



## Xcode Project


### Making the Xcode Project

So, the only thing different about making an Xcode project is adding an extra option to the cmake invocation:

```sh
cmake -G 'Xcode' ..
```

The quoting isn't really necessary, I just thought it might highlight that the X should be capitalized.  Eh.

The console output seems to be mostly the same, so I guess the difference is just in what's written out.  Indeed, there's an xcodeproj there so I can just open that and start looking at things.

```sh
open DevilutionX.xcodeproj
```


### Running The Program

So, first thing I want to do is just be able to launch the darn thing from Xcode.  From there, I should be able to start poking around a bit.

Lots of warnings during compilation, but no errors so that's fine.  There were warnings before.

First result?  "yo where da diabdat.mpq at".  Shoulda figured that.  Where's Xcode creating the bundle to run?

Peering through the various sections of Xcode (yes, yes, I'm blatantly not looking at any manuals... shame) I see a link step that outputs to `/.../DevilutionX/devilutionX/build/Debug/devilutionx.app/Contents/MacOS/devilutionx`.  That's probably a pretty good bet.  Hopefully a symlink is fine because I'm not copy/pasting diabdat everywhere on my harddrive if I can help it.

```
pushd Debug
ln -s /Applications/diabdat.mpq diabdat.mpq
```

Give it a run... and it works.  Nice!

Oh, huh, a weird freeze and some sort of error message:

```
/.../DevilutionX/devilutionX/Source/engine.h:29:15: runtime error: load of misaligned address 0x00013bbb3057 for type 'dvl::DWORD' (aka 'unsigned int'), which requires 4 byte alignment
0x00013bbb3057:m note: pointer points here
 b8 32 00 00 a9  3c 00 00 9a 46 00 00 97  50 00 00 a5 5a 00 00 cc  64 00 00 13 6f 00 00 64  79 00 00
             ^ 
SUMMARY: UndefinedBehaviorSanitizer: undefined-behavior /.../DevilutionX/devilutionX/Source/engine.h:29:15 in 
/.../DevilutionX/devilutionX/Source/engine.h:30:15: runtime error: load of misaligned address 0x00013bbb305b for type 'dvl::DWORD' (aka 'unsigned int'), which requires 4 byte alignment
0x00013bbb305b:m note: pointer points here
 a9  3c 00 00 9a 46 00 00 97  50 00 00 a5 5a 00 00 cc  64 00 00 13 6f 00 00 64  79 00 00 0a 00 91 00
              ^ 
SUMMARY: UndefinedBehaviorSanitizer: undefined-behavior /.../DevilutionX/devilutionX/Source/engine.h:30:15 in 
```

Moving on...



## Starting to Step Through the App


### Where's The Entry Point?

Looking at the files, `main.cpp`, probably.  Looking inside that file, yep, `int main(...)`.  That was easy.


### What Happens On Startup?

So, assuming of course that `main.cpp` is indeed the entry point, and I haven't seen any other `int main()`s yet so it's probably a good place to start, the first thing that happens is this:

```cpp
int main(int argc, char **argv)
{
    auto cmdline = build_cmdline(argc, argv);
    return dvl::WinMain(NULL, NULL, (char *)cmdline.c_str(), 0);
}
```

Some basic command line building is done.  Not interested in that yet.  But after that, `dvl::WinMain` is called with a bunch of stuff.  Where's that defined?  `diablo.cpp:292`:

```cpp
int APIENTRY WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow)
{
    diablo_init(lpCmdLine);
    diablo_splash();
    mainmenu_loop();
    UiDestroy();

    return 0;
}
```

So, buncha init stuff, play the opening movie, then enter into the main menu loop.

Looking inside `mainmenu_loop` and the other functions there threw me for a loop for a bit until I noticed that the menu result function was actually setting a global-in-namespace variable.  Woo.  Anyway.


### Headers?  What Headers?

I've noticed while navigating around in Xcode, mostly via "Go to definition", that the header files aren't being shown, and that the little hierarchy thingy at the top of the text area doesn't really show which ever one is open as being located anywhere in the project in particular.  I'm not really sure what's up with that, and don't remember enough about Xcode and how it handles files in its projects to even start guessing.  It does find the files when I do "Go to definition" on something in them or on an include, though, so it obviously knows they're present and can find them on disk.

Hopefully I'll figure out or learn something at some point because it's kind of annoying not knowing whether a given header is in Devilution or DevilutionX sources.
