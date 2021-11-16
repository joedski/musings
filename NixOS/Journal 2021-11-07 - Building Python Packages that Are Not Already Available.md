---
tags:

prev: ./Journal 2021-09-30 - Setting up a Nix Shell for Tesseract and OpenCV in Python.md

rally:
    MarkdownLinkWithName: >-
        [US...](https://...) ...
---

Journal 2021-11-07 - Building Python Packages that Are Not Already Available
============================================================================

[Thomaz Leite](https://thomazleite.com/posts/development-with-nix-python/) to the rescue again: You can use `buildPythonPackage` to build other packages.



Just the Package Itself
-----------------------

Let's suppose I want to use [ImageHash==4.2.1](https://pypi.org/project/ImageHash/4.2.1/)...

```nix
{
  pkgs ? import <nixpkgs> {}
}:

let
  imageHashLib = pkgs.python38Packages.buildPythonPackage rec {
    pname = "ImageHash";
    version = "4.2.1";

    # Here's where we actually download things (or declare the download rather)
    src = pkgs.python38Packages.fetchPypi {
      inherit pname version;
      sha256 = "a4af957814bc9832d9241247ff03f76e778f890c18147900b4540af124e93011";
    };

    # Pass through things that it depends on:
    # https://github.com/JohannesBuchner/imagehash/blob/v4.2.1/setup.py#L26-L32
    propagatedBuildInputs = with pkgs.python38Packages; [
      six
      numpy
      scipy
      pillow
      pywavelets
    ];

    doCheck = false;
  };

  customPython = pkgs.python38.buildEnv.override {
    extraLibs = [ imageHashLib ];
  };
in

pkgs.mkShell {
  buildInputs = [
    customPython
  ];
}
```

Strangely, when I ran it without the `sha256` attribute I didn't receive the expected error... all I saw was:

```
error: hash '' has wrong length for hash type 'sha256'
(use '--show-trace' to show detailed location information)
```

I think that was down to setting `pname = "imagehash"` (all lowercase) instead of the expected `pname = "ImageHash"` (PascalCase).  Fixing the casing didn't remove the error, but adding the hash from [the Pypi page](https://pypi.org/project/ImageHash/4.2.1/#copy-hash-modal-a060dbb9-72d9-4fa7-befa-6c725d14aa5e) did make things Just Work and got me into a shell.



With Other Existing Packages that Aren't Dependencies
-----------------------------------------------------

Now, in prior explorations of just adding packages, I saw this as the example:

```nix
{ pkgs ? import <nixpkgs> {} }:

let
  pythonEnv = pkgs.python38.withPackages pyPkgs: with pyPkgs; [
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

Leite doesn't do that, instead they do this:

```nix
{ pkgs ? import <nixpkgs> {} }:

let
  pythonEnv = pkgs.python38.buildEnv.override {
    extraLibs = [
      opencv4
      pytesseract
    ];
  }
in mkShell {
  buildInputs = with pkgs; [
    tesseract4 # do I even need this...?
    pythonEnv
  ];
}
```

Similar, but seems more amenable to mixing multiple different things.

Based on that, I think I should be able to just do this:

```nix
{
  pkgs ? import <nixpkgs> {}
}:

let
  imageHashLib = pkgs.python38Packages.buildPythonPackage rec {
    pname = "ImageHash";
    version = "4.2.1";

    src = pkgs.python38Packages.fetchPypi {
      inherit pname version;
      sha256 = "a4af957814bc9832d9241247ff03f76e778f890c18147900b4540af124e93011";
    };

    propagatedBuildInputs = with pkgs.python38Packages; [
      six
      numpy
      scipy
      pillow
      pywavelets
    ];

    doCheck = false;
  };

  customPython = pkgs.python38.buildEnv.override {
    extraLibs = [
      imageHashLib
      pkgs.python38Packages.opencv4
      pkgs.python38Packages.pytesseract
    ];
  };
in

pkgs.mkShell {
  buildInputs = [
    customPython
  ];
}
```
