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
  2. [nodegit docs on `Cred.userpassPlaintextNew()` factory](http://www.nodegit.org/api/cred/#userpassPlaintextNew)
4. [Issue on nodegit](https://github.com/nodegit/nodegit/issues/1436) and [actual gist](https://gist.github.com/getify/f5b111381413f9d9f4b2571c7d5822ce) with someone doing things with it.  May be helpful?
5. [Examples in nodegit](https://github.com/nodegit/nodegit/tree/master/examples)
6. StackOverflow question: [How can I download a single raw file from a private github repo using the command line?](https://stackoverflow.com/questions/18126559/how-can-i-download-a-single-raw-file-from-a-private-github-repo-using-the-comman)

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

Obviously, this isn't the greatest thing since the keys have to exist on disk, but a strong (crypto-random) password will at least give us some security.  NOTE: See a couple paragraphs on, we ~~don't~~ might not need to store the keys on disk.  Point about strong password remains, of course.

On the other hand, by [(Ss 3.2)](http://www.nodegit.org/api/cred/#userpassPlaintextNew) we should be able to just use an API key rather than an SSH key, although I think that means we have to use `https`, so that may or may not be problematic.

If the SSH keys can be fit into environment variables (and, ideally, they would be, rather than env vars being limited to <=255 `char`s...) we could just use [`Cred.sshKeyMemoryNew()`](http://www.nodegit.org/api/cred/#userpassPlaintextNew).


### Just Grabbing the README

Now, we don't want to clone, we just want to access.  Theoretically, anything that lets us specify some sort of `fetchOpts` should let us use `git:` to connect.

I'm gonna have to dig around in [their API docs](http://www.nodegit.org/api/) to see if there's anything that lets us do what we want without creating a temp file on disk.  Not sure if there is, though, so we might have to do just that.  Well, at least READMEs aren't that big.



## cURL

As shown in [(Ss 6)](https://stackoverflow.com/questions/18126559/how-can-i-download-a-single-raw-file-from-a-private-github-repo-using-the-comman), we should be able to use a personal access (see [(Ss 1.1)](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/)) token to download files directly over HTTPS.

```sh
ACCESS_TOKEN=INSERTACCESSTOKENHERE
REPO_OWNER=owner_account_name
REPO_NAME=repo_name
REPO_ITEM_PATH=path/to/file/in/repo.ext
curl \
  -H "Authorization: token $ACCESS_TOKEN" \
  -H 'Accept: application/vnd.github.v3.raw' \
  --remote-name --location \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/contents/$REPO_ITEM_PATH"
```

Though, with GitHub's v4 API, you may need to change the `Accept` vaule to `Accept: application/vnd.github.v4.raw`.

Job as of writing is using GitHub Enterprise, and our current version still uses GitHub's v3 API.  Apparently this is accessed at `https://$GITHUB_HOST/api/v3` rather than `https://api.$GITHUB_HOST/`.

In any case, this does seem to work.  Excellent.
