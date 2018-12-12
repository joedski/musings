CSP Directives and Hash Values of Inline Scripts
================================================

1. [MDN Article on Subresource Integrity][ss-1]
2. [MDN Article on the `script-src` CSP Directive][ss-2]
3. [Post about Hacking Your Self, talking about `srcipt-src`][ss-3]

[ss-1]: https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
[ss-2]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src
[ss-3]: https://www.troyhunt.com/locking-down-your-website-scripts-with-csp-hashes-nonces-and-report-uri/

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

The upshot is that that script and (probably) only that s script will fit that hash.  The downside is you have to calculate a new digest every time your script changes.
