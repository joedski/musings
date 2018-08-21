Connecting to GitHub over SSH with Node: Journal 2018-08-21 - Initial Research
==============================================================================

While probably more broadly applicable than just GitHub, this deals specifically with that case due to, what else, project needs.  It should hopefully serve as a concrete starting point to abstraction of the general case of SSH-based access to APIs.



## Sources

1. [Connecting to GitHub with SSH](https://help.github.com/articles/connecting-to-github-with-ssh/)
  1. Possibly more helpful: [Connecting to GitHub using a personal auth token](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/)
    1. May or may not actually be useful?  But it might let us download things without cloning.  Might.
  2. Docs TOC on [Authenticating to GitHub](https://help.github.com/categories/authenticating-to-github/)
2. [node-ssh](https://www.npmjs.com/package/node-ssh)
  1. Dunno if it's actually relevant, but hey, it's something.
3. [nodegit](https://github.com/nodegit/nodegit)
  1. Probably more relevant than (2).
4. [Issue on nodegit](https://github.com/nodegit/nodegit/issues/1436) and [actual gist](https://gist.github.com/getify/f5b111381413f9d9f4b2571c7d5822ce) with someone doing things with it.  May be helpful?
5. [Examples in nodegit](https://github.com/nodegit/nodegit/tree/master/examples)

Skimming through things, this may take a bit more than just, well, skimming.



## nodegit

It looks like the most comprehensive solution is nodegit.  Using a public/private keypair, along with a suitable password (configured via env), we can make `git:` calls as they do in [one of their unit tests](https://github.com/nodegit/nodegit/blob/master/test/tests/clone.js):

```js
it("can clone with ssh while manually loading an encrypted key", function() {
  var test = this;
  var url = "git@github.com:nodegit/test.git";
  var opts = {
    fetchOpts: {
      callbacks: {
        certificateCheck: function() {
          return 1;
        },
        credentials: function(url, userName) {
          // NOTE: No pre-existing agent is assumed here,
          // we just point straight to the keys on disk.
          return NodeGit.Cred.sshKeyNew(
            userName,
            sshEncryptedPublicKeyPath,
            sshEncryptedPrivateKeyPath,
            "test-password"
          );
        }
      }
    }
  };

  return Clone(url, clonePath, opts).then(function(repo) {
    assert.ok(repo instanceof Repository);
    test.repository = repo;
  });
});
```

Obviously, this isn't the greatest thing since the keys have to exist on disk, but a strong (crypto-random) password will at least give us some security.


### Just Grabbing the README

Now, we don't want to clone, we just want to access.  Theoretically, anything that lets us specify some sort of `fetchOpts` should let us use `git:` to connect.

I'm gonna have to dig around in [their API docs](http://www.nodegit.org/api/) to see if there's anything that lets us do what we want without creating a temp file on disk.  Not sure if there is, though.
