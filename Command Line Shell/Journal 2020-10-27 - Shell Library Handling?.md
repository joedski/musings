Journal 2020-10-27 - Shell Library Handling?
========

shell library functions...

```
MY_BASH_LIB_DIR=~/.dotfiles/bash/lib
```

then

```
set -e

source "$MY_BASH_LIB_DIR/script-utils"

script_self_path="$(script-utils --script-path "${BASH_SOURCE[0]}")"
```

Hm.

```
script-utils --export "$script_self_path"
```

```
set -e

### BEGIN source "$MY_BASH_LIB_DIR/script-utils"
script-utils-script-path() {
  # https://stackoverflow.com/a/246128/4084010
  # ...
}

script-utils-export() {
  # ...
}

script-utils() {
  # ...
}
### END source "$MY_BASH_LIB_DIR/script-utils"

script_self_path="$(script-utils source-path} "${BASH_SOURCE[0]}")"
```
