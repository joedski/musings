More Basics
===========



## Finding Images

Docker has the command `search` to search Dockerhub for relevant images.

```
$ docker search ubuntu
NAME                              DESCRIPTION                                     STARS     OFFICIAL   AUTOMATED
ubuntu                            Ubuntu is a Debian-based Linux operating s...   5238      [OK]       
ubuntu-upstart                    Upstart is an event-based replacement for ...   69        [OK]       
rastasheep/ubuntu-sshd            Dockerized SSH service, built on top of of...   59                   [OK]
ubuntu-debootstrap                debootstrap --variant=minbase --components...   27        [OK]       
torusware/speedus-ubuntu          Always updated official Ubuntu docker imag...   27                   [OK]
nickistre/ubuntu-lamp             LAMP server on Ubuntu                           13                   [OK]
nuagebec/ubuntu                   Simple always updated Ubuntu docker images...   12                   [OK]
nickistre/ubuntu-lamp-wordpress   LAMP on Ubuntu with wp-cli installed            8                    [OK]
nimmis/ubuntu                     This is a docker images different LTS vers...   5                    [OK]
maxexcloo/ubuntu                  Base image built on Ubuntu with init, Supe...   2                    [OK]
admiringworm/ubuntu               Base ubuntu images based on the official u...   1                    [OK]
jordi/ubuntu                      Ubuntu Base Image                               1                    [OK]
darksheer/ubuntu                  Base Ubuntu Image -- Updated hourly             1                    [OK]
vcatechnology/ubuntu              A Ubuntu image that is updated daily            0                    [OK]
datenbetrieb/ubuntu               custom flavor of the official ubuntu base ...   0                    [OK]
lynxtp/ubuntu                     https://github.com/lynxtp/docker-ubuntu         0                    [OK]
labengine/ubuntu                  Images base ubuntu                              0                    [OK]
teamrock/ubuntu                   TeamRock's Ubuntu image configured with AW...   0                    [OK]
widerplan/ubuntu                  Our basic Ubuntu images.                        0                    [OK]
esycat/ubuntu                     Ubuntu LTS                                      0                    [OK]
ustclug/ubuntu                    ubuntu image for docker with USTC mirror        0                    [OK]
webhippie/ubuntu                  Docker images for ubuntu                        0                    [OK]
uvatbc/ubuntu                     Ubuntu images with unprivileged user            0                    [OK]
konstruktoid/ubuntu               Ubuntu base image                               0                    [OK]
dorapro/ubuntu                    ubuntu image                                    0                    [OK]

```

Number of things here, including a couple with PHP, one of which has Wordpress on it.

This one was not toooo long, but we could end up with quite long results for some thins... Suppose we only want somewhat popular ones?  We can filter by stars, for instance, using `--filter=stars=10` to limit images to those with 10+ stars:

```
$ docker search --filter=stars=10 ubuntu
NAME                       DESCRIPTION                                     STARS     OFFICIAL   AUTOMATED
ubuntu                     Ubuntu is a Debian-based Linux operating s...   5238      [OK]       
ubuntu-upstart             Upstart is an event-based replacement for ...   69        [OK]       
rastasheep/ubuntu-sshd     Dockerized SSH service, built on top of of...   59                   [OK]
ubuntu-debootstrap         debootstrap --variant=minbase --components...   27        [OK]       
torusware/speedus-ubuntu   Always updated official Ubuntu docker imag...   27                   [OK]
nickistre/ubuntu-lamp      LAMP server on Ubuntu                           13                   [OK]
nuagebec/ubuntu            Simple always updated Ubuntu docker images...   12                   [OK]
```

> NOTE: In older versions (somewhere around docker 1.6?), --stars or -s was a separate option.  This has been folded into --filters.

So, we wanted ubuntu here and found what we wanted, and we're gonna download that.

```
$ docker pull ubuntu
Using default tag: latest
latest: Pulling from library/ubuntu

b3e1c725a85f: Downloading [===============>                                   ] 15.24 MB/50.22 MB
4daad8bdde31: Download complete 
63fe8c0068a8: Download complete 
4a70713c436f: Download complete 
bd842a2105a8: Download complete 
```

Of note here, it says `Using default tag: latest`.  Recall that when creating an image, you have the option to provide a tag after the image title using a colon: `docker build -t myimage:some-tag .`  This tag can also be provided when searching, but since we didn't provide one, the default of `latest` was used.


### Different Tags... Different Images?

Not always!  `latest` as it may seem to indicate tells you that it's the latest version of a given image.  We could have a specific version we want to lock to, however, or else we might want only the latest trusty.

Let's pull... `16.04`.

```
$ docker pull ubuntu:16.04
16.04: Pulling from library/ubuntu
Digest: sha256:7a64bc9c8843b0a8c8b8a7e4715b7615e4e1b0d8ca3c7e7a76ec8250899c397a
Status: Downloaded newer image for ubuntu:16.04
$ _
```

Hm.  Interesting.  What do we have in `images`, now?

```
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
ubuntu              16.04               104bec311bcd        5 days ago          129 MB
ubuntu              latest              104bec311bcd        5 days ago          129 MB
busybox             latest              e02e811dd08f        10 weeks ago        1.093 MB
```

Ah, indeed.  `16.04` and `latest` both have the same image id!  They're the same image!



## Logs!

```
$ docker run -itd ubuntu
081ecec3ca14ef37a5d0379d3692ae114b3d1e5986b3de12791c5787641a9a73
$ docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
081ecec3ca14        ubuntu              "/bin/bash"         39 seconds ago      Up 38 seconds                           gloomy_sinoussi
$ _
```

So we can see that the Ubuntu image just runs `/bin/bash` by default.  Not really unexpected.  Everyone loves bash, unless they don't.

Let's take a peek at the history in the Ubuntu image.

```
$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
first-dockerfile    latest              9d826c68c560        3 days ago          1.093 MB
ubuntu              16.04               104bec311bcd        6 days ago          129 MB
ubuntu              latest              104bec311bcd        6 days ago          129 MB
ubuntu              14.04               3f755ca42730        6 days ago          188 MB
busybox             latest              e02e811dd08f        10 weeks ago        1.093 MB
$ docker history 104bec311bcd
IMAGE               CREATED             CREATED BY                                      SIZE                COMMENT
104bec311bcd        6 days ago          /bin/sh -c #(nop)  CMD ["/bin/bash"]            0 B                 
<missing>           6 days ago          /bin/sh -c mkdir -p /run/systemd && echo 'doc   7 B                 
<missing>           6 days ago          /bin/sh -c sed -i 's/^#\s*\(deb.*universe\)$/   1.895 kB            
<missing>           6 days ago          /bin/sh -c rm -rf /var/lib/apt/lists/*          0 B                 
<missing>           6 days ago          /bin/sh -c set -xe   && echo '#!/bin/sh' > /u   745 B               
<missing>           6 days ago          /bin/sh -c #(nop) ADD file:7529d28035b43a2281   129 MB    
```

Huh.  There's some stuff in there.  And indeed, there's the `CMD` up there.  We can override it if we want, of course, by specifying the last optional argument of the run command.

```
$ docker run -itd ubuntu /bin/sh
81a360de152d582a949f4e8088df1c6675a4b3bf9deb775fe43daf87a61a3425
$ docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
81a360de152d        ubuntu              "/bin/sh"           3 seconds ago       Up 2 seconds                            pedantic_wing
081ecec3ca14        ubuntu              "/bin/bash"         6 minutes ago       Up 6 minutes                            gloomy_sinoussi
$ _
```

As seen in the backup example, though, we don't have to just run shells.  We can run other things, too.

```
$ docker run -itd ubuntu uname -a
d205ff4dd0b165075b73ab16436b2213efb8c1682fcbae6c5a6665ee83b97d60
$ docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED              STATUS              PORTS               NAMES
81a360de152d        ubuntu              "/bin/sh"           About a minute ago   Up About a minute                       pedantic_wing
081ecec3ca14        ubuntu              "/bin/bash"         8 minutes ago        Up 8 minutes                            gloomy_sinoussi
$ _
```

Oh, hum.  There's no new image, certainly none starting with `d205ff...`...  Well, `uname -a` is a one-off command, it just does a thing then exist.  It stands to reason that, since we backgrounded the container, it just finished up in the background and we're none the wiser!

Indeed, if we do a `ps -a`, then...

```
$ docker ps -a
CONTAINER ID        IMAGE               COMMAND             CREATED              STATUS                          PORTS               NAMES
d205ff4dd0b1        ubuntu              "uname -a"          About a minute ago   Exited (0) About a minute ago                       elegant_lamarr
81a360de152d        ubuntu              "/bin/sh"           3 minutes ago        Up 3 minutes                                        pedantic_wing
081ecec3ca14        ubuntu              "/bin/bash"         9 minutes ago        Up 9 minutes                                        gloomy_sinoussi
$ _
```

Indeed, there it is.  So, what did it print?  Well, we know `uname -a` writes to stdout, so we should have logs.

```
$ docker logs d205ff4dd0b1
Linux d205ff4dd0b1 4.4.39-moby #1 SMP Fri Dec 16 07:34:12 UTC 2016 x86_64 x86_64 x86_64 GNU/Linux
$ _
```

Oh, hey, there's a `uname -a`.



## More overriding fun

This time, we'll override the `/bin/bash` command with a `sleep` command, then `watch docker ps`.

```
$ docker run -itd ubuntu sleep 10 && watch docker ps
-bash: watch: command not found
$ _
```

I don't have watch! D:

> One `brew install watch` later...

```
$ docker run -itd ubuntu sleep 10 && watch docker ps
Every 2.0s: docker ps                                                                                             Borialis.local: Wed Dec 21 20:59:02 2016

CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
de5e1d2aef33        ubuntu              "sleep 10"          5 seconds ago       Up 4 seconds                            pensive_agnesi
81a360de152d        ubuntu              "/bin/sh"           12 minutes ago      Up 12 minutes                           pedantic_wing
081ecec3ca14        ubuntu              "/bin/bash"         18 minutes ago      Up 18 minutes                           gloomy_sinoussi
```

Then, after the 10 seconds...

```
Every 2.0s: docker ps                                                                                             Borialis.local: Wed Dec 21 20:59:16 2016

CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
81a360de152d        ubuntu              "/bin/sh"           12 minutes ago      Up 12 minutes                           pedantic_wing
081ecec3ca14        ubuntu              "/bin/bash"         19 minutes ago      Up 19 minutes                           gloomy_sinoussi
```

Neat!



## More Logging

Let's setup an infinite loop.

```
$ docker run -itd --name loopy ubuntu /bin/sh -c "while true; do echo SQUIRREL; sleep 1; done"
1f81c0e030e1373440f11b7f577b04317ba33072b0c166644e785e52f486a85d
$ _
```

Okay, there's that.  Now let's take a look at the help for the log command.

```
$ docker logs -h
Flag shorthand -h has been deprecated, please use --help

Usage:	docker logs [OPTIONS] CONTAINER

Fetch the logs of a container

Options:
      --details        Show extra details provided to logs
  -f, --follow         Follow log output
      --help           Print usage
      --since string   Show logs since timestamp
      --tail string    Number of lines to show from the end of the logs (default "all")
  -t, --timestamps     Show timestamps
```

Oh, `-h` is deprecated... Herp.

Anyway, let's try `-tf`.

```
$ docker logs -ft loopy
2016-12-22T02:05:21.571086261Z SQUIRREL
2016-12-22T02:05:22.572946693Z SQUIRREL
2016-12-22T02:05:23.575364101Z SQUIRREL
2016-12-22T02:05:24.576214696Z SQUIRREL
2016-12-22T02:05:25.577722384Z SQUIRREL
2016-12-22T02:05:26.582365230Z SQUIRREL
2016-12-22T02:05:27.583473744Z SQUIRREL
2016-12-22T02:05:28.588036579Z SQUIRREL
2016-12-22T02:05:29.591030206Z SQUIRREL
2016-12-22T02:05:30.592182382Z SQUIRREL
2016-12-22T02:05:31.593751551Z SQUIRREL
2016-12-22T02:05:32.594650418Z SQUIRREL
2016-12-22T02:05:33.599403513Z SQUIRREL
2016-12-22T02:05:34.600941696Z SQUIRREL
2016-12-22T02:05:35.606248769Z SQUIRREL
2016-12-22T02:05:36.607602448Z SQUIRREL
2016-12-22T02:05:37.609237394Z SQUIRREL
2016-12-22T02:05:38.613542586Z SQUIRREL
2016-12-22T02:05:39.615574156Z SQUIRREL
2016-12-22T02:05:40.617092421Z SQUIRREL
2016-12-22T02:05:41.620027554Z SQUIRREL
2016-12-22T02:05:42.620820158Z SQUIRREL
2016-12-22T02:05:43.627840391Z SQUIRREL
2016-12-22T02:05:44.629239728Z SQUIRREL
2016-12-22T02:05:45.634906684Z SQUIRREL
2016-12-22T02:05:46.635418573Z SQUIRREL
2016-12-22T02:05:47.637646831Z SQUIRREL
2016-12-22T02:05:48.642530017Z SQUIRREL
2016-12-22T02:05:49.648541713Z SQUIRREL
2016-12-22T02:05:50.650788482Z SQUIRREL
2016-12-22T02:05:51.656409082Z SQUIRREL
2016-12-22T02:05:52.657307013Z SQUIRREL
2016-12-22T02:05:53.662283534Z SQUIRREL
2016-12-22T02:05:54.665090357Z SQUIRREL
2016-12-22T02:05:55.666623277Z SQUIRREL
2016-12-22T02:05:56.669344149Z SQUIRREL
2016-12-22T02:05:57.670736670Z SQUIRREL
2016-12-22T02:05:58.673830318Z SQUIRREL
```

Right.



## Others

### Stats and Top

```
$ docker run -itd --name loopy ubuntu /bin/sh -c "while true; do echo SQUIRREL; sleep 2; done"
7dc383cacd52...
$ docker stats loopy
CONTAINER           CPU %               MEM USAGE / LIMIT     MEM %               NET I/O             BLOCK I/O           PIDS
loopy               0.10%               444 KiB / 1.951 GiB   0.02%               648 B / 648 B       0 B / 0 B           2
...
```

How about an actual top?

```
$ docker run -itd --name loopy2 ubuntu /bin/sh -c "while true; do echo 'Hi"'!'"'; sleep 10; done"
db98e4ed15a5321978f2fd4c1a0d6e7496f96ea3e7b9fd696017fee23b19dd32
$ watch docker top loopy2 -ef
Every 2.0s: docker top loopy2 -ef                                                                                 Borialis.local: Wed Dec 21 21:11:09 2016

PID                 USER                TIME                COMMAND
3822                root                0:00                /bin/sh -c while true; do echo 'Hi!'; sleep 10; done
3866                root                0:00                sleep 10
```

Note here that the `PID` of the `sleep` command changes every 10 seconds.

However, `top` can show us all the commands running, so if we do this...

```
$ docker exec -itd loopy2 sleep 20
$ watch docker top loopy2 -ef
Every 2.0s: docker top loopy2 -ef                                                                                 Borialis.local: Wed Dec 21 21:14:08 2016

PID                 USER                TIME                COMMAND
3822                root                0:00                /bin/sh -c while true; do echo 'Hi!'; sleep 10; done
4142                root                0:00                sleep 20
4150                root                0:00                sleep 10
```

Now there's a sleep 20 in there, too!

20 seconds later, it's gone!  And in that time, `sleep 10` got executed two more times.

```
Every 2.0s: docker top loopy2 -ef                                                                                 Borialis.local: Wed Dec 21 21:14:24 2016

PID                 USER                TIME                COMMAND
3822                root                0:00                /bin/sh -c while true; do echo 'Hi!'; sleep 10; done
4222                root                0:00                sleep 10
```


### Inspection
