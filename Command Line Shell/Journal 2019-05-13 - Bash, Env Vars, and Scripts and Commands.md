Journal 2019-05-13 - Bash, Env Vars, and Scripts and Commands
========

I am wonder.  Is my ~~refrigherahtor running~~ env var making it through?

Learning by doing then extrapolating.

I want to figure out how to set env vars for a child command without necessarily leaking them to the current environment.



## The Commands

First, `target-cmd.sh`:

```sh
#!/bin/bash

if [[ $FOO ]]; then
  echo "Foo = $FOO"
else
  echo "No Foo :("
fi

if [[ $BAR ]]; then
  echo "Bar = $BAR"
else
  echo "No Bar :("
fi
```

Next, `proxy-cmd.sh`

```sh
#!/bin/bash

./target-cmd.sh
```


### Env Var Set in Local Env But Not Exported, Target Command is Run

```sh
FOO='This is "Foo"'
BAR="This is 'Bar'"
./target-cmd.sh
```

Output:

```
No Foo :(
No Bar :(
```


### Env Var Set Inline, Target Command is Run

```sh
FOO='This is "Foo"' BAR="This is 'Bar'" ./target-cmd.sh
```

```
Foo = This is "Foo"
Bar = This is 'Bar'
```


### Env Var Set Inline, Proxy Command is Run To Call Target Command

```sh
FOO='This is "Foo"' BAR="This is 'Bar'" ./proxy-cmd.sh
```

```
Foo = This is "Foo"
Bar = This is 'Bar'
```

So, if a Parent Command can see it, then those vars made it into the env of that Parent Command, and thus should be in the env of any Child Command.  I mean, that's SOP, just verifying.


### Splatting Env Vars Inline with Bash Array, Target Command is Run

```sh
VS=( FOO='This is "Foo"' BAR="This is 'Bar'" )
"${VS[@]}" ./target-cmd.sh
```

```
-bash: FOO=This is "Foo": command not found
```

Hm.


### Splatting Env Vars Bash Array as Options to Env Command, Target Command is Run

```sh
VS=( FOO='This is "Foo"' BAR="This is 'Bar'" )
env "${VS[@]}" ./target-cmd.sh
```

```
Foo = This is "Foo"
Bar = This is 'Bar'
```


### Splatting Env Vars Bash Array as Args to Export Command, Target Command is Run

```sh
VS=( FOO='This is "Foo"' BAR="This is 'Bar'" )
export "${VS[@]}"
./target-cmd.sh
```

```
Foo = This is "Foo"
Bar = This is 'Bar'
```

Also works with `proxy-cmd.sh` as expected.  Obviously, this puts the env vars into the current env, but hey.
