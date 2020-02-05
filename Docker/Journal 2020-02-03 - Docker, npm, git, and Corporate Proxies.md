Journal 2020-02-03 - Docker, npm, git, and Corporate Proxies
========

> With a title like that, you know this is going to be a _fun_ adventure.
>
> As of yet, it's unresolved.

Oof.  The bane of many a project, at least when local-deving.

First thought here: Add an image arg for a proxy URL that then runs a conditional `npm config set` script.

So, let's try something like this then.

```dockerfile
FROM node:latest

# If other things are needed, update them first.
RUN apk --update add bash git curl

ARG NPM_PROXY

# ...

# NOTE: semicolons required!
# Also, mmmmm, MITM mode.
RUN if [[ -n "${NPM_PROXY}" ]]; then \
      npm config set proxy "${NPM_PROXY}"; \
      npm config set https-proxy "${NPM_PROXY}"; \
      npm config set strict-ssl false; \
    fi

RUN npm install

# ...
```

```sh
docker build . --build-arg NPM_PROXY="$HTTP_PROXY"
```

That works but now I'm running into a different issue.  Though, it might actually be the same issue, since it's something not being able to resolve a domain name.

```dockerfile
FROM node:latest

# If other things are needed, update them first.
RUN apk --update add bash git curl

ARG BUILD_PROXY

# ...

# NOTE: semicolons required!
# Also, mmmmm, MITM mode.
RUN if [[ -n "${BUILD_PROXY}" ]]; then \
      npm config set proxy "${BUILD_PROXY}"; \
      npm config set https-proxy "${BUILD_PROXY}"; \
      npm config set strict-ssl false; \
    fi

RUN export HTTP_PROXY="${BUILD_PROXY}"; export HTTPS_PROXY="${BUILD_PROXY}"; npm install

# ...
```

```sh
docker build . --build-arg BUILD_PROXY="$HTTP_PROXY"
```

That results in an error finding our corporate internal GitHub instance.  Oof.  Just can't win this one, can I.  It seems like I need proxies to be set only in npm during download of dependencies, but then set globally using the env vars during running of post-install scripts.

Or, maybe not.  Looking at the error, I see this:

```
npm ERR! Error while executing:
npm ERR! /usr/bin/git ls-remote -h -t https://GITHUB_TOKEN@github.example.com/GitHubOrg/thingy.git
npm ERR! 
npm ERR! fatal: unable to access 'https://GITHUB_TOKEN@github.example.com/GitHubOrg/thingy.git/': Received HTTP code 502 from proxy after CONNECT
npm ERR! 
npm ERR! exited with error code: 128

npm ERR! A complete log of this run can be found in:
npm ERR!     /root/.npm/_logs/2020-02-03T19_16_59_445Z-debug.log
```

Let's try setting the git proxies, too, because those're also separate.

```dockerfile
FROM node:latest

# If other things are needed, update them first.
RUN apk --update add bash git curl

ARG BUILD_PROXY

# ...

# NOTE: semicolons required!
# Also, mmmmm, MITM mode.
RUN if [[ -n "${BUILD_PROXY}" ]]; then \
      npm config set proxy "${BUILD_PROXY}"; \
      npm config set https-proxy "${BUILD_PROXY}"; \
      npm config set strict-ssl false; \
      git config --global http.proxy "${BUILD_PROXY}"; \
      git config --global https.proxy "${BUILD_PROXY}"; \
    fi

RUN export HTTP_PROXY="${BUILD_PROXY}"; \
    export HTTPS_PROXY="${BUILD_PROXY}"; \
    npm install

# ...
```

No luck the first time, still getting that previous git error.  Try the other corporate proxy I have noted down.

> NOTE: Also as a complicating factor, I had to relocate and get on the corporate VPN at this point, so that's another variable.  Yay.

```
npm ERR! cb() never called!

npm ERR! This is an error with npm itself. Please report this error at:
npm ERR!     <https://npm.community>

npm ERR! A complete log of this run can be found in:
npm ERR!     /root/.npm/_logs/2020-02-03T20_38_57_523Z-debug.log
```

Huh.  I don't even know how to report that without getting people on to the company network.

Just out of desperation I decided to try smooshing the two `RUN` commands together on the basis that maybe some changes weren't being kept between layers due to write permissions or something, I dunno.


```dockerfile
FROM node:latest

# If other things are needed, update them first.
RUN apk --update add bash git curl

ARG BUILD_PROXY

# ...

# NOTE: semicolons required!
# Also, mmmmm, MITM mode.
RUN if [[ -n "${BUILD_PROXY}" ]]; then \
      npm config set proxy "${BUILD_PROXY}"; \
      npm config set https-proxy "${BUILD_PROXY}"; \
      npm config set strict-ssl false; \
      git config --global http.proxy "${BUILD_PROXY}"; \
      git config --global https.proxy "${BUILD_PROXY}"; \
      export HTTP_PROXY="${BUILD_PROXY}"; \
      export HTTPS_PROXY="${BUILD_PROXY}"; \
    fi; \
    npm install

# ...
```

Same thing.

Maybe I should try a later docker image?
