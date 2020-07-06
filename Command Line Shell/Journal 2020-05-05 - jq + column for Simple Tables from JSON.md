Journal 2020-05-05 - jq + column for Simple Tables from JSON
========

Given JSON that's an array of objects...

```bash
jq -r \
  '($ARGS.positional, (.[] | [.[$ARGS.positional[]]])) | join("\t")' \
  --args random uuid base64 \
  < data.json \
  | column -ts$'\t'
# random  uuid                                  base64
# 18895   C9E9A805-85AF-4956-A865-7BAB46CB8A42  h6wau6ao
# 16493   DF37F5B7-2FA8-4DCB-8B2B-CC52E878C44F  F9gtM/x2
# ...
```

Nice.  Obviously an enveloped collection requires a bit of extraction first, but eh.  No biggie, just add `.path.to |` to the start of it.

Doesn't support tabs or new-lines in values, but eh.  I guess we could stringify each string to JSON encode it if necessary.  Or just replace every `\` with `\\`, then every non-`0x20` whitespace with its C-escape equivalent.



## Random Data

I need some random data, first.  For the sake of example, I'll put it into a TSV file because that's pretty easy to do.

```bash
(
  echo "uuid"$'\t'"base64"$'\t'"random"
  for ((i_ = 0; i_ < 10; ++i_)); do
    echo "$(uuidgen)"$'\t'"$(openssl rand -base64 6)"$'\t'"$RANDOM"
  done
) > data.tsv
```

Let's make a json array of that.

```bash
(
  echo "["
  sed -E '1d; s/^([^'$'\t'']+)'$'\t''([^'$'\t'']+)'$'\t''([^'$'\t'']+)$/{"uuid":"\1","base64":"\2","random":"\3"},/; $ s/,$//;'
  echo "]"
) < data.tsv > data.json
```

Now let's turn that back into TSV with jq...

```bash
jq -r \
  '($ARGS.positional, (.[] | [.[$ARGS.positional[]]])) | join("\t")' \
  --args random uuid base64 \
  < data.json
# random  uuid  base64
# 18895 C9E9A805-85AF-4956-A865-7BAB46CB8A42  h6wau6ao
# 16493 DF37F5B7-2FA8-4DCB-8B2B-CC52E878C44F  F9gtM/x2
# ...
```

In fact, all we have to do is pipe that into `column` for, well, columns.

```bash
jq -r \
  '($ARGS.positional, (.[] | [.[$ARGS.positional[]]])) | join("\t")' \
  --args random uuid base64 \
  < data.json \
  | column -ts$'\t'
# random  uuid                                  base64
# 18895   C9E9A805-85AF-4956-A865-7BAB46CB8A42  h6wau6ao
# 16493   DF37F5B7-2FA8-4DCB-8B2B-CC52E878C44F  F9gtM/x2
# ...
```


