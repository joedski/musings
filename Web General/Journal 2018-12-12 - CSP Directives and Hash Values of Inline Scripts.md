CSP Directives and Hash Values of Inline Scripts
================================================

1. [MDN Article on Subresource Integrity][ss-1]
2. [MDN Article on the `script-src` CSP Directive][ss-2]
3. [Post about Hacking Your Self, talking about `srcipt-src`][ss-3]
4. [`hash-csp`, a Node Stream utility for `script-src` JS hashing][ss-4]
    1. If for nothing else, it shows how to accomplish it in Node.
    2. Only supports sha256, but that's basically what I use.
    3. Uses [`sjcl`][ss-4-3], which as of 2019-02-01, seems to support sha512 as well.  Cool.  After hashing, it then Base 64 encodes it.  Stick a `sha256-` on it and call it done.  Don't forget the single quotes.
5. [`sha.js`][ss-5]
    1. Seems very simple and no-nonsense.  Does only what we need, too.
6. [`hash.js`][ss-6]
    1. Also simple and no-nonsense, though I'm not quite sure how to convert the output digest into a Base 64 string.
    2. [`sha.js`][ss-5] on the other hand seems to return a `Buffer`, or if you pass an encoding argument, a `string` with that encoding by calling `Buffer#toString(encoding)`.  Much more convenient.

[ss-1]: https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
[ss-2]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src
[ss-3]: https://www.troyhunt.com/locking-down-your-website-scripts-with-csp-hashes-nonces-and-report-uri/
[ss-4]: https://github.com/chrahunt/hash-csp
[ss-4-3]: https://www.npmjs.com/package/sjcl
[ss-5]: https://www.npmjs.com/package/sha.js
[ss-6]: https://github.com/indutny/hash.js

If not using the `'unsafe-inline'` value in the `script-src` CSP directive, you need to do one of two things:
- Use a nonce, a per-served one-time value:
    - Give each inline script tag a nonce value by specifying that one-time value in its `nonce` tag attribute: `<script nonce="blahblahblah">...</script>`
    - Specify that nonce in the `script-src` directive as `'nonce-${NONCE_VALUE_BASE64}'`
- Specify the digest hash of each script:
    - Specify the hash of each script in the `script-src` directive as `'${ALGO}-${DIGEST_BASE64}'`, eg `'sha256-+kAjda186JooB+4imgGPb/H3rA6BQtq8gWe+hKR96rk='`

The nonce one requires a bit of extra work on the server because you have to genenrate a unique nonce every time you send the page to the client, and match that up with an according header.  Granted, you can pretty easily automate that with templating, but still, it's an active piece of machinery.  The actual nonce value isn't really important, though it should be reasonably random (not sure how strongly, some places say pseudorandom is enough), and needs to be Base 64 encoded.  You could probably use a string if you wanted to.

The hash on the other hand requires you to calculate a digest for the contents of a script tag (or the target script file!) and base 64 encode that.  Fortunately for the hash newbs like me, examples of how to accomplish this are provided in [MDN's article on Subresource Integrity][ss-1]:

```sh
# if you have openssl, you can use that:
cat FILE.js | openssl dgst -sha256 -binary | openssl base64 -A

# Or, if you have shasum and base64:
shasum -b -a 256 FILE.js | awk '{ print $1 }' | xxd -r -p | base64
```

Supported sizes seem to be:
- 256
- 384
- 512

The upshot is that that script and (probably) only that script will fit that hash.  The downside is you have to calculate a new digest every time your script changes.
