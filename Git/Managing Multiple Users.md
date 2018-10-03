Managing Multiple Users
=======================

I've a few times run afoul of pushing commits with the wrong email, I'm just not very diligent with checking that when committing.

So, to solve this, I'm going to do a couple things:
- Remove `user.name` and `user.email` from my global gitconfigs.
- Write a script to run the `git config user.name` and `git config user.email` commands, picking from a list stored somewhere.
- The command will be git-aliased to `set-user` because convenience.



## User List

Don't want to complicate this, so I'll just make it a plain text file, probably `~/.gituserlist`, with contents like this:

```
Joseph Sikorski <joedski@gmail.com>
Joe Sikorski <joe@otherplace.com>
```

Though, that's all well and good, but I need to be able to have different lists on different computers.  I could include some way to reference files, but I think instead I'll just have a couple files hard coded.  This doesn't need to be fancy.

Something like this:
- `~/.gituserlist`
- `~/.gituserlist.local`

Then, to get a full list of users, I just do

```sh
diff <(sort ~/.gituserlist) <(sort ~/.gituserlist.local) \
  | grep -E '^[><] ' \
  | sed 's/^[><] //'
```

It's not the most thorough, and depends on me making the names the same, but it does guarantee that only different names are in there.  Of course, if I have duplicate entries, then ... maybe I should fix that, instead.



## The Set User Command

This is a bit more complicated since I want to make sure I only have clean input:
- Whatever I use to select a user should select only 1 user.
- If multiple users are selected, it should error.
- If no users are selected, it should error.

Since I'm intentionally not going to be very fancy with this, I can do things like:
- `wc -l` to verify we have only 1 user selected.  This works because every user is 1 line.
- `grep -s "$INPUT"` for the search part.
- Piping through `sed -E 's/ +<[^<>]*>$//'` to get just the name
- Piping through `sed -E 's/.* +<([^<>]*)>$/\1/'` to get just the email

Given that, it's pretty easy to write:

```sh
#!/bin/bash

INPUT=$1

if [[ -z "$INPUT" || "$INPUT" = '--help' || "$INPUT" = '-h' ]]; then
  cat <<HELP

Usage

  git set-user --list
  git set-user -l
    see available users

  get set-user <search>
    set a user by search text

Important Files

  The following files are checked for user names:

    - ~/.gituserlist
    - ~/.gituserlist.local

  The .gituserlist.local file is optional, but recommended.

HELP
  exit 0
fi

if [[ ! -f ~/.gituserlist ]]; then
  echo "~/.gituserlist not found"
  exit 1
fi

if [[ -f ~/.gituserlist.local ]]; then
  USER_LIST=$(
    diff <(sort ~/.gituserlist) <(sort ~/.gituserlist.local) \
      | grep -E '^[><] ' \
      | sed -E 's/^[><] //'
  )
else
  USER_LIST=$(sort ~/.gituserlist)
fi

if [[ "$INPUT" = '--list' || "$INPUT" = '-l' ]]; then
  echo "$USER_LIST"
  exit 0
fi

USER_ENTRY=$(echo "$USER_LIST" | grep -s "$INPUT")

# echoing an empty string without -n is treated as 1 line by wc,
# so just directly testing if it's empty.
if [[ -z "$USER_ENTRY" ]]; then
  echo 'No matching user entries'
  exit 1
fi

USER_ENTRY_COUNT=$(echo "$USER_ENTRY" | wc -l | sed -E 's/^ +//; s/ +$//')

if [[ $USER_ENTRY_COUNT -ne 1 ]]; then
  echo 'Ambiguous search matched more than 1 user:'
  echo "$USER_ENTRY" | sed 's/^/- /'
  exit 1
fi

USER_ENTRY_NAME=$(echo "$USER_ENTRY" | sed -E 's/ +<[^<>]*>$//')
USER_ENTRY_EMAIL=$(echo "$USER_ENTRY" | sed -E 's/.* +<([^<>]*)>$/\1/')

echo "git config user.name \"$USER_ENTRY_NAME\""
echo "git config user.email \"$USER_ENTRY_EMAIL\""
git config user.name "$USER_ENTRY_NAME"
git config user.email "$USER_ENTRY_EMAIL"
echo 'done!'
```

Also echoing out the actual commands used because, well, why not?
