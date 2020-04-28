Journal 2020-04-28 - Simple Parameter Format Checking with Bash and Egrep
========

What I'd like to do:

- Check many parameters at once
- Error on all parameters that do not match their format
- Print messages!
- Easy to add formats



## API Sketching


### Thought 1: stdin

This is cute, but runs into a few problems:

- Properly consuming stdin line-by-line in Bash is esoteric.
- Now you're having to do string parsing.  Hopefully you didn't need to put a `\n` in one of your arg values.
- Cannot freely whitespace things since values are not quoted.  Free whitespace requires extra parsing effort.

```bash
bash test-formats.bash - <<EOARGS
creator_id id $creator_id
new_user_email email $new_user_email
new_user_role user-role $new_user_role
EOARGS
(( $? == 0 )) || exit 1
```


### Thought 2: Quoted Args

So if the last one wasn't that great, why not just use args?

- Mildly annoying remembering to escape the line endings.
- Can use `||` directly, no need to check `$?`.
- Quoted args mean no string parsing on our part.  Need a `\n` or something worse?  Go ahead.

I think I'll go with this one.

```bash
bash test-formats.bash \
  creator_id     id        "$creator_id" \
  new_user_email email     "$new_user_email" \
  new_user_role  user-role "$new_user_role" \
|| exit 1
```


## Implementation

It's actually fairly easy to implement and, hopefully, easy to read.  Can be plunked into pile of scripts for some quick-n-dirty input validation.

```bash
#!/bin/bash

if (( $# == 0 || $# % 3 != 0 )); then
  if (( $# % 3 != 0 )); then
    echo "Arguments must come in triples of: <name> <format> <value>"
  fi

  echo "
Usage: \$0 {(<name> <format> <value>) (<name> <format> <value>) ...}

Validates parameters against formats and emits error messages to stderr
for any parameters that fail, then exits non-0 if any parameters fail.

  name
    Parameter name so the user knows which one failed formatting.

  format
    What format to check the value against.

  value
    Value to check.

Examples:

  \$0 new-user-id id 'd34db33f' \\
  || exit 1

    Validate that the parameter being called 'new-user-id' whose value
    is 'd34db33f' matches the format 'id'.

    Exit the calling script with an error status if validation fails.

  \$0 new-user-id    id    'd34db33f' \\
      new-user-email email 'moo@cow.com' \\
  || exit 1

    Same as above but with an additional parameter, 'new-user-email'
    whose value is 'moo@cow.com' and should match the format 'email'.

    Exit if one or both parameters fail validation.
" >&2

  # Exit 1 here to always invalidate tests.
  exit 1
fi

function egrep_test () {
  echo -n "$1" | egrep "$2" > /dev/null
}

# Technically could be done with egrep too, but I'm not sure
# if I really want to bother going down that road.
function in_set_test () {
  local value=$1
  shift
  local test_set
  test_set=( "$@" )

  for test_el in "${test_set[@]}"; do
    if [[ $value = $test_el ]]; then
      return 0
    fi
  done

  return 1
}

any_test_did_error=0

function maybe_error () {
  local ret_val=$1
  local arg_name=$2
  local error_message=$3

  if (( $ret_val != 0 )); then
    echo "$arg_name: $error_message" >&2
    any_test_did_error=1
  fi
}

while (( $# > 0 )); do
  arg_name=$1
  shift
  arg_format=$1
  shift
  arg_value=$1
  shift

  case "$arg_format" in
    ( id )
      egrep_test "$arg_value" '^[0-9a-f]{8}$'
      maybe_error $? "$arg_name" "'$arg_value' is not id-like"
      ;;

    ( email )
      # It's intentionally broad because the real rules about what's allowed
      # are super complicated and I don't care.
      egrep_test "$arg_value" '^[^@]+@[^@]+$'
      maybe_error $? "$arg_name" "'$arg_value' is not email-like"
      ;;

    # This sort of thing will be specific to a given pile of scripts.
    ( user-role )
      valid_value_set=( Admin Manager User )
      in_set_test "$arg_value" "${valid_value_set[@]}"
      # Hm.  What to do about spaces...?
      maybe_error $? "$arg_name" "'$arg_value' is not one of the valid values: $(echo -n "${valid_value_set[@]}")"
      ;;

    # Escape hatch for any one-off formats, though specific formats
    # should be preferred since that's more documentational.
    ( format:* )
      egrep_test "$arg_value" "${arg_format#format:}"
      maybe_error $? "$arg_name" "'$arg_value' does not match expected format: ${arg_format#format:}"
      ;;

    # Always tell yourself when you messed up.
    ( * )
      maybe_error 1 "$arg_name" "Unknown format '$arg_format'"
      ;;
  esac
done

exit $any_test_did_error
```
