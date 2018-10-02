Expired Accounts and Authenticated Access
=========================================

Somewhat recently my contractor account expired at my workplace, so I've been transitioning to a new account.  One of the issues that arose from this is that of authenticated access to the internal GitHub instance from command line.

To start with, I kept running into this error here:

```
remote: Your account is suspended. Please check with your installation administrator.
fatal: unable to access 'https://github.example.com/Org/example-project.git/': The requested URL returned error: 403
```

Okay, so, I get that much.  Time to [make a new SSH key pair and upload the public key to my GH account](https://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/).  (I'm on a Mac, hence the Mac specific options)

```
$ ssh-keygen -t rsa -b 4096 -C me@example.com
Generating public/private rsa key pair.
Enter a file in which to save the key (/Users/me/.ssh/id_rsa): /Users/me/.ssh/id_rsa.company_newid
Enter passphrase (empty for no passphrase): ____
Enter same passphrase again: ____
$ eval "$(ssh-agent -s)"
$ ssh-add -K ~/.ssh/id_rsa.company_newid
```

That was easy enough, and it seemed to work for cloning down repos, but I ran into it again when trying to install dependencies, specifically using `npm` here as they're Node projects.

I tried just messing around with the SSH config, eventually trying something like this:

```
Host github.example.com
  HostName github.example.com
  User git
  IdentityFile ~/.ssh/id_rsa_example
  IdentitiesOnly yes
  AddKeysToAgent yes
  UseKeychain yes
```

But that didn't seem to fix the errors during installation; I still got the error about a suspended account, as if it were pinned to the old account or something.

Next, on suggestion from a coworker, I tried creating a personal access token and then setting up a URL transform for Git when using HTTPS:

```
[url "https://d43db33fPersonalAccessToken:x-oauth-basic@github.example.com"]
	insteadOf = https://github.example.com
```

This seems to be working, at least.
