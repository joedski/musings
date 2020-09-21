Journal 2020-09-17 - Getting the Source Directory of the Current Script From Within The Script
========

1. This answer seems to be the best one I've seen, the most cross-platform compatible: https://stackoverflow.com/a/246128/4084010

In summary:

```bash
# Preface: Neither of these will work if you `cd` before doing this!

# If you're not concerned about the last element of the path
# being a symlink, this will work:
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# If you are concerned about last-element symlinks, you'll need
# this multiline solution.
# Also useful in the face of `source` or `bash -c`.
SOURCE="${BASH_SOURCE[0]}"
# resolve $SOURCE until the file is no longer a symlink
while [ -h "$SOURCE" ]; do
  DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
```

As a function, then,

```bash
#!/bin/bash

# usage: dirname_of_source "${BASH_SOURCE[0]}"
dirname_of_source() {
  if (( $# < 1 )); then
    echo 1>&2 <<END_USAGE
Usage: dirname_of_source "\${BASH_SOURCE[0]}"

NOTE: do NOT \`cd\` before calling this or the path returned will be wrong!
END_USAGE

    return 1
  fi

  local current_source
  local current_dir

  current_source="$1"

  while [ -h "$current_source" ]; do
    current_dir="$( cd -P "$( dirname "$current_source" )" >/dev/null 2>&1 && pwd )"
    current_source="$( readlink "$current_source" )"
    [[ $current_source != /* ]] && current_source="$current_dir/$current_source"
  done

  current_dir="$( cd -P "$( dirname "$current_source" )" >/dev/null 2>&1 && pwd )"

  echo "$current_dir"
}
```

With a helpful message to tell us when we forget to call it correctly.

Incidentally, we always have to pass `"${BASH_SOURCE[0]}"` in, as otherwise we get the dir of the file containing the function, not the script that sourced that file!

Trivial to demonstrate...

```bash
#!/bin/bash

# Put this in .../foo/lib/dirname_of_self.bash

# NOTE: This doesn't work because this function sees a different BASH_SOURCE
# than any script sourcing this file sees.  Therefore, you get the dir containing
# this file, not the file that sourced this file.

# usage: dirname_of_self
dirname_of_self() {
  local current_source
  local current_dir

  current_source="${BASH_SOURCE[0]}"

  while [ -h "$current_source" ]; do
    current_dir="$( cd -P "$( dirname "$current_source" )" >/dev/null 2>&1 && pwd )"
    current_source="$( readlink "$current_source" )"
    [[ $current_source != /* ]] && current_source="$current_dir/$current_source"
  done

  current_dir="$( cd -P "$( dirname "$current_source" )" >/dev/null 2>&1 && pwd )"

  echo "$current_dir"
}
```

```bash
#!/bin/bash
# and put this in .../foo/get_dirname_of_self.bash

source "./lib/dirname_of_self.bash"

# This gives us the lib dir, not our dir!
echo "$(dirname_of_self)"
```
