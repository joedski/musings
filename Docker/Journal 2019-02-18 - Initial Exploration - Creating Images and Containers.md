Initial Exploration - Creating Images and Containers
====================================================

This isn't quite helpful as a Getting Started journal since I'm already familiar with some Docker concepts, so this 'll mostly be going through `docker help whatever` and random links.



## Testing Images

Sooooo for one thing we needed to verify our stuff wasn't running afoul of some process-running-as-root thing.  To do this, we wanted to just inspect the process as it ran in a container and make sure it's not doing that.

First thing I'm gonna do is just `docker help`, which spits out an imperial ton of commands.  Helping!

Second thing, `docker help build` for creating images from Dockerfiles, and `docker help create` for creating containers from images.  The former spits out some options, while the latter spits out a metric tonne of options.  Turns out containerization is complicated.  Who knew?

I don't think I need toooooo much for what we want to do.  Just `build`, `create`, and poke.  Probably via `exec` if I recall correctly.

So...

```sh
docker build ./Dockerfile
# unable to prepare context: context must be a directory: /Users/josephsikorski/Documents/Projects/dna-and-cat/dnaFramework/Dockerfile
```

Bah.

```
$ docker help build

Usage:	docker build [OPTIONS] PATH | URL | -

Build an image from a Dockerfile

Options:
  ... other options
  -f, --file string             Name of the Dockerfile (Default is 'PATH/Dockerfile')
  ... other options
```

So `PATH` is a dir.  Thus, the command is actually...

```sh
docker build .
```

That shoooould give us an image with a UUID or something we can pass to `docker create $IMAGE_ID`

```
Sending build context to Docker daemon  345.9MB
Step 1/9 : FROM node:8.9.4-alpine
Get https://registry-1.docker.io/v2/: Service Unavailable
```

Oh, right, corporate network doesn't like `docker.io`.  Bleh.

Switch networks and re-run `docker build`...

```
Sending build context to Docker daemon  345.9MB
Step 1/9 : FROM node:8.9.4-alpine
8.9.4-alpine: Pulling from library/node
605ce1bd3f31: Pull complete
79b85b1676b5: Pull complete
20865485d0c2: Pull complete
Digest: sha256:6bb963d58da845cf66a22bc5a48bb8c686f91d30240f0798feb0d61a2832fc46
Status: Downloaded newer image for node:8.9.4-alpine
 ---> 406f227b21f5
Step 2/9 : RUN apk --update add bash git curl
 ---> Running in 441ec1dcbed5
fetch http://dl-cdn.alpinelinux.org/alpine/v3.6/main/x86_64/APKINDEX.tar.gz
fetch http://dl-cdn.alpinelinux.org/alpine/v3.6/community/x86_64/APKINDEX.tar.gz
(1/12) Installing ncurses-terminfo-base (6.0_p20171125-r1)
(2/12) Installing ncurses-terminfo (6.0_p20171125-r1)
(3/12) Installing ncurses-libs (6.0_p20171125-r1)
(4/12) Installing readline (6.3.008-r5)
(5/12) Installing bash (4.3.48-r1)
Executing bash-4.3.48-r1.post-install
(6/12) Installing ca-certificates (20161130-r2)
(7/12) Installing libssh2 (1.8.0-r1)
(8/12) Installing libcurl (7.61.1-r1)
(9/12) Installing curl (7.61.1-r1)
(10/12) Installing expat (2.2.0-r1)
(11/12) Installing pcre (8.41-r0)
(12/12) Installing git (2.13.7-r2)
Executing busybox-1.26.2-r9.trigger
Executing ca-certificates-20161130-r2.trigger
OK: 35 MiB in 25 packages
Removing intermediate container 441ec1dcbed5
 ---> d51d5938d3c8
Step 3/9 : WORKDIR /home/node/server
 ---> Running in 2671054efbcb
Removing intermediate container 2671054efbcb
 ---> 6941ac5b372f
Step 4/9 : COPY dist/package.json .
 ---> 51cd95d53147
Step 5/9 : RUN npm install
 ---> Running in 00f77eae9e72
npm ERR! Error while executing:
npm ERR! /usr/bin/git ls-remote -h -t https://TOKENTOKENTOKENTOKEN@github.company.com/COMBINE/fe-web-server.git
npm ERR!
npm ERR! fatal: unable to access 'https://TOKENTOKENTOKENTOKEN@github.company.com/COMBINE/fe-web-server.git/': Could not resolve host: github.company.com
npm ERR!
npm ERR! exited with error code: 128

npm ERR! A complete log of this run can be found in:
npm ERR!     /root/.npm/_logs/2019-02-19T21_07_07_392Z-debug.log
The command '/bin/sh -c npm install' returned a non-zero code: 1
```

phthphtphphtphpthphhhtpthphtphthtphtphpth.  Okay, back to the corporate network.  We've got the image dependencies at least, so we should be fine now.  Run `docker build .` again...

```
Sending build context to Docker daemon  345.9MB
Step 1/9 : FROM node:8.9.4-alpine
 ---> 406f227b21f5
Step 2/9 : RUN apk --update add bash git curl
 ---> Using cache
 ---> d51d5938d3c8
Step 3/9 : WORKDIR /home/node/server
 ---> Using cache
 ---> 6941ac5b372f
Step 4/9 : COPY dist/package.json .
 ---> Using cache
 ---> 51cd95d53147
Step 5/9 : RUN npm install
 ---> Running in 15ad156c33c8
npm ERR! code ENOTFOUND
npm ERR! errno ENOTFOUND
npm ERR! network request to https://registry.npmjs.org/newrelic failed, reason: getaddrinfo ENOTFOUND registry.npmjs.org registry.npmjs.org:443
npm ERR! network This is a problem related to network connectivity.
npm ERR! network In most cases you are behind a proxy or have bad network settings.
npm ERR! network
npm ERR! network If you are behind a proxy, please make sure that the
npm ERR! network 'proxy' config is set properly.  See: 'npm help config'

npm ERR! A complete log of this run can be found in:
npm ERR!     /root/.npm/_logs/2019-02-19T21_10_20_227Z-debug.log
The command '/bin/sh -c npm install' returned a non-zero code: 1
```

y tho.

First link: https://stackoverflow.com/questions/35515203/docker-npm-install-error-getaddrinfo-enotfound-registry-npmjs-org-registry-npmj
- First suggestion is to restart docker.

So, let's try that first suggestion of restarting Docker.  Docker for Mac uses the little menu thingy in the menu bar.  Wait for the boxes to stop animating... then re-run `docker build .` again...  Same error.

Eh.  Eeeeh.  Eeeeeeeeh.  Try `ENV NO_PROXY=registry.npmjs.org`?  Try `NO_PROXY=registry.npmjs.org docker build .`?  ... both?

Nada.

Uh.  Hm.  No idea what to do now.  We kinda need internal network access, but the fact I can't seem to reach `registry.npmjs.org` is kinda blocking installing... anything external.  I don't really get where it's being blocked, either, since I can install outside of the docker container.

Wish I'd written down how we handled this last time.  If we did, anyway.

Next I think I'll try: `npm config set proxy http://proxy.company.com:80` in the Dockerfile.  ... just, you know, with the company's actual proxy, not this example one.

```diff
-RUN npm install
+RUN npm config set proxy http://proxy.company.com:80/ \
+  && npm config set https-proxy http://proxy.company.com:80/ \
+  && npm config set strict-ssl false \
+  && npm install
```

```
...
 ---> s0m3H45hf0R1mag3
Successfully built s0m3H45hf0R1mag3
```

That worked.  Cool.  Maybe I should delete the proxy settings afterwards?  Eh, probably not if doing internal testing.

Annoying, though, that we can't use quite the same Dockerfile between the build environment and local.  Blah.

Anyway, it now shows up in `docker image list`, so yay.

I wonder if the other company proxy I have works better... Can I just set that locally and not bother wiht the `npm config` commands in the Dockerfile?  ... narp.  Boo.

Next is just creating the container and starting it.

```sh
docker create --env-file ./envfile s0m3H45hf0R1mag3
# someLongStringOfHexCharactersOfYourContainer
```

Where `envfile` here looks something like

```
# this is a comment in the envfile
ENV_VAR_1=some value here
ENV_VAR_2=something-else

# an env var with just a name will copy its value from the shell's environment.
HTTP_PROXY
HTTPS_PROXY
NO_PROXY
```

Then, I should be able to just run

```sh
docker start someLongStringOfHexCharactersOfYourContainer
```

Or if I want to interact, `docker start -ia someLongStringOfHexCharactersOfYourContainer` although our server doesn't really accept input... So maybe only `-a`, then.

Now, there's some other options that can be used to make things friendlier... I think `docker build --tag product/project:test ...` would be fine?  At least for local testing.  Then `docker create --name project-test ...` for the container itself, just so we could then do `docker start project-test` and `docker stop project-test` and `docker container rm project-test`.
