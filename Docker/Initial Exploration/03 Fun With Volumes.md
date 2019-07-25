Fun with Volumes
================

We can create a sort of ephemeral volume by using the `-v` option on `docker run`.  All that `docker run --help` reports on `-v` is:

> v, --volume value                Bind mount a volume (default [])

I guess "bind mount"ing is a thing?  Well, let's try it, creating a new container, specifying a bind-mounted volume with `-v`.

> Note: We can get away with only specifying `7330` because we only have one or a few containers.  If we had more, that might collide!

```
$ docker run -itd -v /beepboop busybox
7330f9c212b7d40c7f3f3933b9c54b062c7817b1171e387b61648e1833fea22f
$ docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
7330f9c212b7        busybox             "sh"                5 seconds ago       Up 3 seconds                            hopeful_goldstine
$ docker attach 7330
/ # ls /
beepboop  bin       dev       etc       home      proc      root      sys       tmp       usr       var
/ # ls /beepboop/
/ # cd /beepboop/
/beepboop # cat > beep.txt
Hi!
/beepboop # ^P^Q
$ _
```

Docker has an `exec` command which runs a command in a given container.

```
$ docker exec 7330 ls /beepboop
beep.txt
$ docker exec 7330 cat /beepboop/beep.txt
Hi!
$ _
```

This file system will exist until the container is destroyed.  If we just stop it and start it again (`docker restart ...`) then it'll still be there.

```
$ docker restart 7330
73
$ docker exec 7330 ls /beepboop
beep.txt
$ _
```


### Instances

All that means if we do this with another container, even if it's instantiated from the same image, its bind-mounted volume is separate.

```
$ docker run -itd -v /beepboop busybox
c1e74daa01871f5db93baf7f0de1d35f2f5d0a0ead47cf39e4e59b27d2220662
```

New CID.

```
$ docker attach c1
/ # cd /beepboop/
/beepboop # ls
(nothing here!)
/beepboop # cat > beep.txt
Hello!
/beepboop # ^P^Q
$ _
```

And we can see that these files have different contents, though they're the same name in ostensibly the same place.

```
$ docker exec c1 cat /beepboop/beep.txt
Hello!
$ docker exec 73 cat /beepboop/beep.txt
Hi!
$ _
```



## Inspection

We can look at some information at either containers or even images themselves by using the inspect command.

```
$ docker inspect 73
[
	{
		"Id": "7330f9c212b7d40c7f3f3933b9c54b062c7817b1171e387b61648e1833fea22f",
		"Created": "2016-12-18T22:29:02.605922308Z",
		"Path": "sh",
		"Args": [],
		...
	}
]
```

Drilling down to `0.Config.Volumes`, we can see a key `"/beepboop"` with the value `{}`.  We can also see in `0.Config.Mounts.0` information about this mount.


### History: See how an Image was Created

We can look at the commands to create the image by using `docker history ...`

```
$ docker history busybox
IMAGE               CREATED             CREATED BY                                      SIZE                COMMENT
e02e811dd08f        10 weeks ago        /bin/sh -c #(nop)  CMD ["sh"]                   0 B                 
<missing>           10 weeks ago        /bin/sh -c #(nop) ADD file:ced3aa7577c8f97040   1.093 MB            
$ _
```

Not much to see here other than the `ADD` command... We'll see more about that when we explore Dockerfiles.



## A basic Dockerfile

```dockerfile
FROM busybox
VOLUME /beepboop
ADD beep.md /beepboop/beep.md
CMD ["/bin/cat", "/beepboop/beep.md"]
```

Here, we're instructing Docker to create a new image by starting with the busybox image, adding a volume at `/beepboop`, then copying the file beep.md into the image at `/beepboop/beep.md`.

Finally, the command `/bin/cat /beepboop/beep.md` is run, the stdout of which Docker helpfully writes to us.


### Building an Image from the Dockerfile

The image can now be built using `docker build`, providing a title via `-t`, and then passing the directory with the desired Dockerfile (and any other relevant files, like server code, etc.)

```
$ docker build -t first-dockerfile .
Sending build context to Docker daemon 3.072 kB
Step 1 : FROM busybox
 ---> e02e811dd08f
Step 2 : VOLUME /beepboop
 ---> Running in 0beffa66623e
 ---> 00346c1c1be5
Removing intermediate container 0beffa66623e
Step 3 : ADD beep.md /beepboop/beep.md
 ---> d03408ca3310
Removing intermediate container 004619265d45
Step 4 : CMD /bin/cat /beepboop/beep.md
 ---> Running in 3069c1a2895b
 ---> 9d826c68c560
Removing intermediate container 3069c1a2895b
Successfully built 9d826c68c560
```

That done, we can now inspect `docker images` to see that, indeed, there's now an image named `first-dockerfile`.

```
$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
first-dockerfile    latest              9d826c68c560        14 seconds ago      1.093 MB
busybox             latest              e02e811dd08f        10 weeks ago        1.093 MB
```

If we run it, it'll `Beep!` at us, because that's the `CMD` we specified.

```
$ docker run first-dockerfile
Beep!
```

We can also inspect the history of commands used to build the image.

```
$ docker history first-dockerfile
IMAGE               CREATED             CREATED BY                                      SIZE                COMMENT
9d826c68c560        6 minutes ago       /bin/sh -c #(nop)  CMD ["/bin/cat" "/beepboop   0 B                 
d03408ca3310        6 minutes ago       /bin/sh -c #(nop) ADD file:eac44126a9976d1ba4   6 B                 
00346c1c1be5        6 minutes ago       /bin/sh -c #(nop)  VOLUME [/beepboop]           0 B                 
e02e811dd08f        10 weeks ago        /bin/sh -c #(nop)  CMD ["sh"]                   0 B                 
<missing>           10 weeks ago        /bin/sh -c #(nop) ADD file:ced3aa7577c8f97040   1.093 MB    
```


### Playing with the resulting image

We can also mount points in the host filesystem to the image's filesystem.

```
$ pushd "Dockerfile Examples/Mounting Host FS"
$ docker run -it -v "$(pwd)/boops:/boops" first-dockerfile /bin/sh
/ # ls /boops
beep.md  boop.md
/ # cat /boops/beep.md 
Beep!
```

Then, editing `boops/beep.md` to have more Beeps in it then returning to the command line, we get:

```
/ # cat /boops/beep.md 
Beep Beep Beep Beep!
```

However, this lets you write to it from the container!  We may not want that.  Thankfully, the fix is simple: Add `:ro` to the end of the mount spec.  The result:

```
$ docker run -it -v "$(pwd)/boops:/boops:ro" first-dockerfile /bin/sh
```



## Sharing Volumes Between Containers

We can use the `--volumes-from <container-name>` option, which, as you might expect, shares the volumes from the named container.

Here, we start with a container we'll name `container-foo`, and add a volume `/foo` to it.  In there, we'll stick a file named `Foo.txt` with some stuff in it.

```
$ docker run -it --volume /foo --name container-foo busybox
/ # ls /
bin   dev   etc   foo   home  proc  root  sys   tmp   usr   var
/ # cd /foo/
/foo # ls
/foo # cat > Foo.txt
Foo foo foo!
/foo # ^P^Q
$ _
```

Next, we'll create a second container named `container-bar` and pass the option `--volumes-from container-foo`.

```
$ docker run -it --volumes-from container-foo --name container-bar busybox
/ # ls /foo
Foo.txt
/ # cat /foo/Foo.txt
Foo foo foo!
/ # _
```

Hmm!  Looks like there's a volume there!  And a file therein!  It even has the same contents!  How about if we write another file...

```
/ # cat > /foo/Bar.txt
Bar bar bar!
/ # ^P^Q
$ docker attach container-foo
/foo # ls
Bar.txt  Foo.txt
/foo # cat Bar.txt
Bar bar bar!
/foo # ^P^Q
$ docker exec container-foo cat /foo/Bar.txt
Bar bar bar!
$ _
```

Looks like it works indeed!  This volume `/foo` is shared across both images!



## Backing Up Containers

So, here we have the so-called canonical example of backing up with Docker.  The command's a bit of a doozy, though.

```
$ docker run --rm --volumes-from SRC_CONTAINER -v $(pwd):/backup IMAGE tar cvf /backup/ARCHIVE_NAME.tar DATA_VOLUME
```

That's a lot to suddenly digest.  Bit by bit, then...

```shell
# Usage:  docker run [OPTIONS] IMAGE [COMMAND] [ARG...]

docker run \
	## [OPTIONS]
	# Remove this new container once it's done running.
	--rm \
	# Share the volumes from SRC_CONTAINER
	--volumes-from SRC_CONTAINER \
	# Mount the host working directory as the volume `/backup` (could be any name but obvious ones are good.)
	-v $(pwd):/backup \
	## IMAGE
	# Image to use.  `busybox` is what I'll use here because it's tiny.
	IMAGE \
	#$ [COMMAND {ARGS}]
	# Write the contents of one of the volumes from SRC_CONTAINER to a tarball in `/backup`.
	# DATA_VOLUME is the absolute path to the volume from SRC_CONTAINER that we want to tar up.
	tar cvf /backup/ARCHIVE_NAME.tar DATA_VOLUME
```

So!  The setup for this is, we have a container named `some-server`, with a data volume mounted therein at `/server-data`.  We want to back that up!

```shell
docker run \
	--rm --volumes-from some-server -v $(pwd):/backup \
	busybox \
	tar cvf /backup/some-server-backup.tar /server-data
```

Naturally if you have a specific backup dir in mind, you'll want to use something other than `$(pwd)`.
