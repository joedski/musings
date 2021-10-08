Journal 2021-09-29 - OCR with Tesseract (And a Dab of OpenCV to Glue Things Together)
=====================================================================================



## Getting Set Up

Still learning about setting up nixenvs so this is going to look silly to future me.

First thought was to just install things globally like a total schmuck

```sh
# Install Tesseract 4 binaries (wheee)
# Can also use "-iA nixpgs.tesseract4" for short.
# I should learn to write a nix package file but one thing at a time here.
nix-env --install --attr nixpkgs.tesseract4

# Create virtual env
python3 -m venv .venv

# Enter the Realm of the Virtual (and good dependency management)
source .venv/bin/activate

# Or whatever it's called
pip install 'opencv>=4.5'
```

Not the most elegant, I've still got one custom environment... What if I could just have the entire environment custom?  I mean, the whole point of Nix is to have Actually-Reproducible Build Environments, and that extends to being able to run a shell within such an environment, soooo...

After tooling around with [nix expression files for a bit](../NixOS/Journal%202021-09-30%20-%20Setting%20up%20a%20Nix%20Shell%20for%20Tesseract%20and%20OpenCV%20in%20Python.md) I've devised this as a good start while I learn more about how to actually write derivations:

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

And if I want to see what all packages are available, I can query an environment:

```sh
nix_unstable=https://github.com/nixos/nixpkgs/archive/nixpkgs-unstable.tar.gz

# Look for opencv in unstable...
nix-env -f "$nix_unstable" -q '.*opencv.*' -aPA 'python38Packages'
# Look for tesseract in unstable...
nix-env -f "$nix_unstable" -q '.*opencv.*' -aPA 'python38Packages'
```

I'd want to use something other than Unstable later, but still.  Heck, if I'm loading up a Pi or something, download it so it's there?  Though, then again, it'll need to actually pull the depnedencies themselves anyway sooo...

Anyway!


### Python Packages Outside of Nix

What do I do if a package I want isn't in the Nix stuffs?
