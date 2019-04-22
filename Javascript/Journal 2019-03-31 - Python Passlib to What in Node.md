Journal 2019-03-31 - Python Passlib to What in Node
===================================================

> At the moment, I'm not continuing this work.  It was decided that since we have no actual customer information we can change the hashing algorithm to whatever we want.

In the midst of porting a prototype API from Flask to Node.  Sad I can't stick with SQLAlchemy, but oh well.  No time right this moment to fiddle with ORMs, I'll just be doing functions that spit out Knex queries.

However, there's something I need to take care of first: Hashing passwords.

In the python code, it went something like this:

```python
from passlib.apps import custom_app_context as pwd_context

def hash_password(pw_text):
    return pwd_context.encrypt(pw_text)
```

I know, not really necesasry to wrap that, but it's purely illustrative anyway.  I need to know what this `passlib.apps/custom_app_context` thing does to know how to replace it in the Node code.

Looking at their quick-use snippet, I see this:

```
>>> hash = custom_app_context.hash("toomanysecrets")
>>> hash
'$5$rounds=84740$fYChCy.52EzebF51$9bnJrmTf2FESI93hgIBFF4qAfysQcKoB0veiI0ZeYU4'
```

It seems to output a string delimited by `$`, with the following values:

- (One could argue there's a leading empty field, but I'm guessing that's not the case here.)
- `5`
- `rounds=84740`
- `fYChCy.52EzebF51`
- `9bnJrmTf2FESI93hgIBFF4qAfysQcKoB0veiI0ZeYU4`

Not sure what the `5` is about, but `rounds` is self explanatory, I guess.  The shorter char-salad string is maybe a salt?

The `$`-delimited format seems to be from some SHA256/512 hashing thing named `sha256_crypt` or `sha512_crypt`.  Their [tutorial on changing defaults](https://passlib.readthedocs.io/en/stable/narr/context-tutorial.html#using-default-settings) shows that a different format, `ldap_salted_md5`, gives things that looks like this: `{SMD5}cIYrPh5f/TeUKg9oghECB5fSeu8=`, which is slightly different.  However, a [later section](https://passlib.readthedocs.io/en/stable/narr/context-tutorial.html#deprecation-hash-migration) shows that `md5_crypt` as opposed to the `ldap` thingy looks much like the `sha256_crypt` versions.

Given the naming, perhaps `sha256_crypt` is itself the name of some standard algorithm/formulation/...standard?

1. [Stack Overflow: What is the specific reason to prefer bcrypt or PBKDF2 over SHA256-crypt in password hashes?](https://security.stackexchange.com/questions/133239/what-is-the-specific-reason-to-prefer-bcrypt-or-pbkdf2-over-sha256-crypt-in-pass)
2. [Stack Overflow: SHA256-CRYPT / SHA512-CRYPT in node.js](https://stackoverflow.com/questions/14178068/sha256-crypt-sha512-crypt-in-node-js)

Looking at those two, at least, there's no built in module for this.  Bleh.  Guess I'll just copy someone's code and hope for the best?  Or use something else?

Might be something to ask, I don't think we have any existing user accounts, and I'm honestly not sure how well we can port the DB over since I don't know what all SQLAlchemy does behind the scenes.  If it produces ordinary tables, there's no problem.  Probably.


### Further Thoughts

Having read more about things generally, (no sources, I know, naughty me) I believe the `5` noted above is the internal algorithm version, that is it's a version number specific to Passlib's implementation, telling Passlib what version among its own algos the given password string was implemented with.

There's a simple way to confirm that, though: Just look at the actual source code you lazy bum.

Maybe later.
