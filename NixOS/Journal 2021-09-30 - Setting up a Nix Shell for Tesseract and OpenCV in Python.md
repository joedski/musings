Journal 2021-09-30 - Setting up a Nix Shell for Tesseract and OpenCV in Python
==============================================================================

So from [the internet](https://nixos.wiki/wiki/Python) I've seen that we can do this sort of thing for python packages:

```nix
with pkgs;
let
  my-python-packages = python-packages: with python-packages; [
    pandas
    requests
    # ... other python packages you want
  ];
  python-with-my-packages = python3.withPackages my-python-packages;
in
mkShell {
  buildInputs = [
    python-with-my-packages
  ];
}
```

Or as I started doing:

```nix
{ pkgs ? import <nixpkgs> {} }:

let
  pythonEnv = pkgs.python3.withPackages pyPackages: with pyPackages; [
    # ... what goes here?  How do I know?
  ];
in mkShell {
  buildInputs = with pkgs; [
    tesseract4
    pythonEnv
  ];
}
```

This was also shown in [this talk]( https://ghedam.at/15978/an-introduction-to-nix-shell) and, for Python particularly, expanded upon by [Thomaz Leite](https://thomazleite.com/posts/development-with-nix-python/).

The minimal example they provide is:

```nix
{ pkgs ? import (fetchTarball https://github.com/nixos/nixpkgs/archive/nixpkgs-unstable.tar.gz) {} }:

pkgs.mkShell {
  buildInputs = [ pkgs.python38 ];
}
```

Though I've seen some references when just skimming that you'll really want a specific tarball rather than just `unstable` if you want a consistent environment.  Anyway!



## What Packages Can I Get Through Nix?

As for how to know what packages I can directly reference?  Looks like [they're defined in the `python-packages.nix` file](https://github.com/NixOS/nixpkgs/blob/master/pkgs/top-level/python-packages.nix).

What about interactively searching?

```sh
nix_unstable=https://github.com/nixos/nixpkgs/archive/nixpkgs-unstable.tar.gz

nix-env -f "$nix_unstable" -qaPA 'python38Packages'
# Or for easier to read args:
nix-env -f "$nix_unstable" --query --available --attr-path --attr 'python38Packages'
```

That certainly works, but can we do better?

```sh
nix_unstable=https://github.com/nixos/nixpkgs/archive/nixpkgs-unstable.tar.gz

nix-env -f "$nix_unstable" -q '.*opencv.*' -aPA 'python38Packages'
```

Result:

```
python38Packages.opencv3  opencv-3.4.15
python38Packages.opencv4  opencv-4.5.2
```

Ooh, lovely.

And Tesseract bindings/wrappers?

```sh
nix-env -f "$nix_unstable" -q '.*tesseract.*' -aPA 'python38Packages'
```

```
python38Packages.pytesseract  python3.8-pytesseract-0.3.8
```

Lovely, and lovely.

With that, we can now write the nix file:

```nix
{ pkgs ? import <nixpkgs> {} }:

let
  pythonEnv = pkgs.python3.withPackages pyPkgs: with pyPkgs; [
    opencv4
    pytesseract
  ];
in mkShell {
  buildInputs = with pkgs; [
    tesseract4
    pythonEnv
  ];
}
```

I mean, we might need more than that, but we can just update the shell if necessary.



## What About Other Python Packages?

[Thomaz Leite](https://thomazleite.com/posts/development-with-nix-python/) to the rescue again: You can use `buildPythonPackage` to build other packages.
