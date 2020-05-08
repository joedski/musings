Journal 2020-05-07 - BYOND Development on a Mac
========

There's really only one reason to work with BYOND, so we're going to skip that.

Instead.

I'm going to just focus on getting a dev environment working on Mac.  A passable one, anyway.  Really, running the compiler and server are pretty easy because they run on Linux, and Linux runs on Docker.  And currently Macs are still x64, until Apple decides they want to use ARM code for everything.

The tricky thing will be running the client, since that'll involve fiddling with Wine.  I'll be running the client from a PC to start with so I don't have to worry about that starting right out.

So, let's go blithely forth.



## Docker Image

The Docker Image is from the [TGStation org](https://github.com/tgstation/byond-docker) (where there's also a [FastDMM for possibly faster (and Mac-runnable) mapping](https://github.com/tgstation/FastDMM)) and is at present built from the `ubuntu:xenial` image as a base.

There's not much to say.  It installs things, downloads the `byond` version specified, make-installs that, cleans up some unneeded stuff, and Pun Pun's your uncle.  Or you're Pun Pun's uncle.  Something like that.


### The Compiler and Server

Since the TGStation image is meant as a base, it doesn't really do anything by itself, so I just started a new image with bash as the command.

```
$ docker build -t byond:test .
$ docker container create -it --name byond-test -v "$PWD/byond:/home/byond" -p 9001:9001 byond:test bash
$ docker start -ai byond-test
```

From there, I'm in the container.

```
# cd /usr/local/byond/bin
# ls
DreamDaemon  DreamDownload  DreamMaker  byondexec  libbyond.so  libext.so
# _
```

- `DreamMaker` is the Compiler.
- `DreamDaemon` is the Server.
- `DreamDownload` does ... something.  Downloads projects, I guess?
    - The "Your First World" project has this command: `DreamDownload byond://Dantom.YourFirstWorld##version=7`
    - I'm going to skip that for now.
- `byondexec` I don't really know.

```
# ./byondexec
Usage: byondexec [program] [program_args]
```

Mysterious.  Guess I'll find out later?

`DreamMaker` is a little more helpful.

```
# ./DreamMaker
DM compiler version 513.1521

DreamMaker [options] sourcefile[.dme]
  options:
     -clean          clean compile
     -h              view this help
     -l              list all included source files
     -o              show the DM object tree
     -code_tree      show the code tree
     -max_errors N   show at most N errors (default 100; 0 for no max)
     -full_paths     show full file path in error/warning messages
     -verbose        show verbose output during compile
```

```
# ./DreamDaemon
Usage: ./DreamDaemon <world.dmb> [port] [options]
Run world.dmb on specified port.
Options are:
    -cd path     (working directory (path of world is default))
    -cgi         (run in cgi mode)
    -core        (produce a core dump if DreamDaemon crashes)
    -home path   (top safe directory (also used for ~ paths))
    -invisible   (don't broadcast the world to the BYOND hub)
    -log logfile (send stderr to logfile)
    -logself     (send stderr to world.log)
    -map-threads on/off (enable/disable multi-threading of map operations only)
    -once        (shutdown after users log out)
    -params data (form-url-encoded parameter string)
    -ports range (range of ports that may be used)
    -profile     (start with profiler enabled)
    -quiet       (less noise in logfile)
    -safe        (file access in world directory)
    -suid path   (run as owner of file or directory*)
    -suidself    (run as owner of world file*)
                 * DreamDaemon must be run by root (not just suid root)
    -threads on/off (enable/disable all multi-threading)
    -trace       (output a debug trace-log file to help the devs track bugs)
    -trusted     (any file and shell access)
    -ultrasafe   (no file access)
    -unsafe_diag (don't block SIGUSR2 during lengthy I/O operations)

(... other misc info)
```

So, I might run it as

```
DreamDaemon /home/byond/world.dmb 9001 -invisible -cd /home/byond -home /home/byond -logself -safe
```

But first, I need to actually build a thing.

... also I should probably create a user named `byond` for full verisimilitude but whatever.


### Customary Beginning

From chapter 1 of [the gentle guide](http://www.byond.com/docs/guide/):

```
# mkdir -p /home/byond/hello-world
# cd /home/byond/hello-world
# cat >hello-world.dme <<EOF
mob/Login()
    world << "Hello, world!"
EOF
```

Yes they're spaces there.  DM doesn't care and hitting Ctrl-V, Tab is anonying.  If this were a real project I'd be using an editorconfig file and go on not caring.

```
# DreamMaker hello-world.dme
DM compiler version 513.1521
loading hello-world.dme
saving hello-world.dmb
hello-world.dmb - 0 errors, 0 warnings (5/8/20 1:23 am)
Total time: 0:00
```

I also put this in there just because I'm lazy.

```
# cat >daemon.bash <<EOF
set -e
DreamDaemon hello-world.dmb 9001 -invisible -cd . -home . -logself -safe
EOF
```

Oof, no vi.  I should probably install that if I'm going to keep doing stuff.  ... oooor just `-v /somewhere/on/my/machine:/home/byond` when I create the container.  Anyway.

It occurs to me I forgot to actually expose a port.  Leeeet's go back and edit that `docker container create` command.

```sh
# old:
docker container create -it --name byond-test byond:test bash
# new:
docker container create -it --name byond-test -v "$PWD/byond:/home/byond" -p 9001:9001 byond:test bash
```

That's better.

And you know what?  Might as well make that `.editorconfig`.

```
# cd /home/byond/hello-world
# DreamMaker hello-world.dme 
DM compiler version 513.1521
hello-world.dme does not exist.
# DreamMaker ./hello-world.dme 
DM compiler version 513.1521
hello-world.dme does not exist.
# DreamMaker $PWD/hello-world.dme 
DM compiler version 513.1521
hello-world.dme does not exist.
```

... huh.

```
# cd /home/byond
# mkdir /home/byond-local
# cp -r hello-world ../byond-local/
# pushd ../byond-local/hello-world
# DreamMaker hello-world.dme 
DM compiler version 513.1521
loading hello-world.dme
saving hello-world.dmb
hello-world.dmb - 0 errors, 0 warnings (5/8/20 1:50 am)
Total time: 0:00
```

Well alright, then.  That's ... something.

#### Running That Introduction

So now we should be able to run it, right?

```
# bash daemon.bash 
^Z
[1]+  Stopped                 bash daemon.bash
# bg
[1]+ bash daemon.bash &
# tail -f hello-world.log 
Fri May  8 02:01:24 2020
World opened on network port 9001.
Welcome BYOND! (5.0 Beta Version 513.1521)
The BYOND hub reports that port 9001 is not reachable.
```

Cool.

So, I've got it running on 9001 and my computer is reachable on the local network.  That means I can now point the BYOND Client at it.

And, success!


### Thoughts From Initial Run

- `DreamMaker` can't see files on Docker volumes.  That's ever so slightly annoying.
- That's really about it.  `DreamDaemon` worked as expected.
    - I didn't bother to try running the `dmb` file from the Docker volume, though, since I had to already run `DreamMaker` on a copy.

Probably some other things as I think about them.  It's late.  Bed time.
