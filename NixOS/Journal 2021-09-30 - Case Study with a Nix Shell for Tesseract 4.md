Journal 2021-09-30 - Case Study with a Nix Shell for Tesseract 4
================================================================

First whack is this, based on what I've seen:

```nix
{ pkgs ? import <nixpkgs> {} }:

with pkgs;

mkShell {
  buildInputs = [
    tesseract4
  ];
}
```

Running `nix-shell` with that file does seem to produce promising output:

<details>
<summary><strong>Script Barf</strong> (click to expand)</summary>

```
these paths will be fetched (504.85 MiB download, 1695.25 MiB unpacked):
  /nix/store/0nlwbj5qbdf7r58x2iqz0a17az2j5fdn-clang-wrapper-7.1.0
  /nix/store/0si89qplidfzi1krrv710xbqkabw6lgr-gettext-0.21
  /nix/store/1a9f3v7m0hddn7y0qlqaw2xiq35w4n6x-gzip-1.10
  /nix/store/1n12bgdza7lysz43xx18if3335h0cz52-tesseract-4.1.1
  /nix/store/1nzc9kapf7rs7w3qw86jd4xpr971iy92-cctools-binutils-darwin-wrapper-949.0.1
  /nix/store/2gv2r98g5vpinxs4nvkq8v8faxj9imdw-bash-interactive-4.4-p23-man
  /nix/store/2kq3igrr75pj6nay6phchgn5x1z1f30z-stdenv-darwin
  /nix/store/2n6hw4cl06sqlcgp1v7pxjsd2537p0lc-findutils-4.7.0
  /nix/store/3c2301dfm5ad8h87bbfgdnpfx812mfpw-bash-interactive-4.4-p23-info
  /nix/store/435171vjbq0h3y14wyn8lir28by5jfln-bash-interactive-4.4-p23-dev
  /nix/store/5qsprysnn4b8agg2rnlnrcq2nzcsqxzs-gawk-5.1.0
  /nix/store/6bwpdgnv13h9agfx7zzsnzdh8gigw2vv-gnugrep-3.6
  /nix/store/6snmf1z43ay6m1b8jv8dr4h8im056a62-compiler-rt-7.1.0-dev
  /nix/store/8spgjbyf2qjk9hv0wf04xsfbbscbbczf-lcms2-2.11
  /nix/store/a2www5kgy1lx7308x1y0sam852ir5713-bzip2-1.0.6.0.1-bin
  /nix/store/am42mwv5bgxvn74s9g176fq6hwvrhpjs-gnumake-4.3
  /nix/store/b052yz8a1s84pcip6yrw7r60hkyz7dfy-libwebp-1.1.0
  /nix/store/bf703k44n78r46xki33s584hmzi7cahx-patch-2.7.6
  /nix/store/cai1f29ac1n1x77r0fa887yvm26327ip-clang-7.1.0
  /nix/store/cz0yr5n75ikd03nwr6mnxww3fg4368jv-adv_cmds-osx-10.5.8-locale
  /nix/store/dlqi219m0dkrv46qkn0c6nkdm29j6j6g-ncurses-6.2-dev
  /nix/store/f8xdyk7d2fzidvbwfhdbcyq0bsx7cgh2-libjpeg-turbo-2.0.6
  /nix/store/gvlq80jriq6b95ia7vzpmdrid9yg8vmn-bash-interactive-4.4-p23-doc
  /nix/store/hr1rqibrnalac7agy7mqbzvq51ya2cqg-leptonica-1.80.0
  /nix/store/ilb26b8d4wzx6q1iwc06ny15ad6ahca5-bash-interactive-4.4-p23
  /nix/store/j66pmw1yjhrhi8h33vzync1sv3rkirw3-openjpeg-2.3.1
  /nix/store/jc9z8rddsgh8pxszrsnnjqfgzgq9cwyb-clang-7.1.0-lib
  /nix/store/jixawkq12brvbw73qaad8jnqgrjadrfn-diffutils-3.7
  /nix/store/jp0bhf9dxx9n324hm24rr3nhcggib1f2-cctools-binutils-darwin-949.0.1
  /nix/store/k3n5mnryy15ia3wgj9lhgg6id7bngsja-compiler-rt-7.1.0
  /nix/store/kf6098f2md7s713vdqydsvv5sfkk7qwk-binutils-2.31.1
  /nix/store/m2hld33i7jadl1yb90xwq2301lfag0ng-xz-5.2.5-bin
  /nix/store/mkncpjh706pqp21bmz9z5bvw1fk5mlhs-zlib-1.2.11-dev
  /nix/store/n1rpna2f6y6dmcj62z43jaj6nv68hwdj-tesseract-4.1.1
  /nix/store/ng999ik7s9nc3qvrh9i64ydz7c6kb0nr-ed-1.16
  /nix/store/ny04sffdhiin03z4s6fd73mqnz1cfgvf-gnused-4.8
  /nix/store/qh3iw0xvs3kbkf40z630raf5n906gd47-libtiff-4.1.0
  /nix/store/qw8nk026pn1xmf3lgdm3g5dsgxa22xy0-libtapi-1000.10.8
  /nix/store/qyzf1mh6ah2lqaffrg2xwfncrmpswqzm-cctools-port-949.0.1
  /nix/store/rck7jbb937pr6sv648y4vfl650s982sf-llvm-7.1.0
  /nix/store/rv9ff7sr4r30rin89ki1v5vqr0dndwad-coreutils-8.32
  /nix/store/rxfc7fn9477xa1f6pa0qxf8prvlks01v-expand-response-params
  /nix/store/wmv6y215w4qi8d6x4zjw21k1ijdl8jrw-gnutar-1.32
  /nix/store/wvgdl7l5z5w3a865jk0v5hksq4vw9ak2-all
  /nix/store/x0cv69aqhc1a3ii001b4dkcgj84308x4-giflib-5.2.1
  /nix/store/y099ysxhhy6q2vk2cb4ph07gqvpkkghg-llvm-7.1.0-lib
  /nix/store/zbz4r0ag3f736rngvmvs8xsp3f2b12m6-ncurses-6.2-man
  /nix/store/zv82bsrgj6wd8jk9hw4nmyr91ja8jp3w-readline-7.0p5
copying path '/nix/store/gvlq80jriq6b95ia7vzpmdrid9yg8vmn-bash-interactive-4.4-p23-doc' from 'https://cache.nixos.org'...
copying path '/nix/store/cz0yr5n75ikd03nwr6mnxww3fg4368jv-adv_cmds-osx-10.5.8-locale' from 'https://cache.nixos.org'...
copying path '/nix/store/wvgdl7l5z5w3a865jk0v5hksq4vw9ak2-all' from 'https://cache.nixos.org'...
copying path '/nix/store/3c2301dfm5ad8h87bbfgdnpfx812mfpw-bash-interactive-4.4-p23-info' from 'https://cache.nixos.org'...
copying path '/nix/store/2gv2r98g5vpinxs4nvkq8v8faxj9imdw-bash-interactive-4.4-p23-man' from 'https://cache.nixos.org'...
copying path '/nix/store/a2www5kgy1lx7308x1y0sam852ir5713-bzip2-1.0.6.0.1-bin' from 'https://cache.nixos.org'...
copying path '/nix/store/k3n5mnryy15ia3wgj9lhgg6id7bngsja-compiler-rt-7.1.0' from 'https://cache.nixos.org'...
copying path '/nix/store/rv9ff7sr4r30rin89ki1v5vqr0dndwad-coreutils-8.32' from 'https://cache.nixos.org'...
copying path '/nix/store/6snmf1z43ay6m1b8jv8dr4h8im056a62-compiler-rt-7.1.0-dev' from 'https://cache.nixos.org'...
copying path '/nix/store/jixawkq12brvbw73qaad8jnqgrjadrfn-diffutils-3.7' from 'https://cache.nixos.org'...
copying path '/nix/store/ng999ik7s9nc3qvrh9i64ydz7c6kb0nr-ed-1.16' from 'https://cache.nixos.org'...
copying path '/nix/store/rxfc7fn9477xa1f6pa0qxf8prvlks01v-expand-response-params' from 'https://cache.nixos.org'...
copying path '/nix/store/2n6hw4cl06sqlcgp1v7pxjsd2537p0lc-findutils-4.7.0' from 'https://cache.nixos.org'...
copying path '/nix/store/5qsprysnn4b8agg2rnlnrcq2nzcsqxzs-gawk-5.1.0' from 'https://cache.nixos.org'...
copying path '/nix/store/0si89qplidfzi1krrv710xbqkabw6lgr-gettext-0.21' from 'https://cache.nixos.org'...
copying path '/nix/store/x0cv69aqhc1a3ii001b4dkcgj84308x4-giflib-5.2.1' from 'https://cache.nixos.org'...
copying path '/nix/store/kf6098f2md7s713vdqydsvv5sfkk7qwk-binutils-2.31.1' from 'https://cache.nixos.org'...
copying path '/nix/store/6bwpdgnv13h9agfx7zzsnzdh8gigw2vv-gnugrep-3.6' from 'https://cache.nixos.org'...
copying path '/nix/store/am42mwv5bgxvn74s9g176fq6hwvrhpjs-gnumake-4.3' from 'https://cache.nixos.org'...
copying path '/nix/store/ny04sffdhiin03z4s6fd73mqnz1cfgvf-gnused-4.8' from 'https://cache.nixos.org'...
copying path '/nix/store/wmv6y215w4qi8d6x4zjw21k1ijdl8jrw-gnutar-1.32' from 'https://cache.nixos.org'...
copying path '/nix/store/1a9f3v7m0hddn7y0qlqaw2xiq35w4n6x-gzip-1.10' from 'https://cache.nixos.org'...
copying path '/nix/store/8spgjbyf2qjk9hv0wf04xsfbbscbbczf-lcms2-2.11' from 'https://cache.nixos.org'...
copying path '/nix/store/f8xdyk7d2fzidvbwfhdbcyq0bsx7cgh2-libjpeg-turbo-2.0.6' from 'https://cache.nixos.org'...
copying path '/nix/store/qw8nk026pn1xmf3lgdm3g5dsgxa22xy0-libtapi-1000.10.8' from 'https://cache.nixos.org'...
copying path '/nix/store/qh3iw0xvs3kbkf40z630raf5n906gd47-libtiff-4.1.0' from 'https://cache.nixos.org'...
copying path '/nix/store/qyzf1mh6ah2lqaffrg2xwfncrmpswqzm-cctools-port-949.0.1' from 'https://cache.nixos.org'...
copying path '/nix/store/b052yz8a1s84pcip6yrw7r60hkyz7dfy-libwebp-1.1.0' from 'https://cache.nixos.org'...
copying path '/nix/store/y099ysxhhy6q2vk2cb4ph07gqvpkkghg-llvm-7.1.0-lib' from 'https://cache.nixos.org'...
copying path '/nix/store/zbz4r0ag3f736rngvmvs8xsp3f2b12m6-ncurses-6.2-man' from 'https://cache.nixos.org'...
copying path '/nix/store/jc9z8rddsgh8pxszrsnnjqfgzgq9cwyb-clang-7.1.0-lib' from 'https://cache.nixos.org'...
copying path '/nix/store/dlqi219m0dkrv46qkn0c6nkdm29j6j6g-ncurses-6.2-dev' from 'https://cache.nixos.org'...
copying path '/nix/store/cai1f29ac1n1x77r0fa887yvm26327ip-clang-7.1.0' from 'https://cache.nixos.org'...
copying path '/nix/store/j66pmw1yjhrhi8h33vzync1sv3rkirw3-openjpeg-2.3.1' from 'https://cache.nixos.org'...
copying path '/nix/store/bf703k44n78r46xki33s584hmzi7cahx-patch-2.7.6' from 'https://cache.nixos.org'...
copying path '/nix/store/hr1rqibrnalac7agy7mqbzvq51ya2cqg-leptonica-1.80.0' from 'https://cache.nixos.org'...
copying path '/nix/store/zv82bsrgj6wd8jk9hw4nmyr91ja8jp3w-readline-7.0p5' from 'https://cache.nixos.org'...
copying path '/nix/store/1n12bgdza7lysz43xx18if3335h0cz52-tesseract-4.1.1' from 'https://cache.nixos.org'...
copying path '/nix/store/ilb26b8d4wzx6q1iwc06ny15ad6ahca5-bash-interactive-4.4-p23' from 'https://cache.nixos.org'...
copying path '/nix/store/n1rpna2f6y6dmcj62z43jaj6nv68hwdj-tesseract-4.1.1' from 'https://cache.nixos.org'...
copying path '/nix/store/435171vjbq0h3y14wyn8lir28by5jfln-bash-interactive-4.4-p23-dev' from 'https://cache.nixos.org'...
copying path '/nix/store/m2hld33i7jadl1yb90xwq2301lfag0ng-xz-5.2.5-bin' from 'https://cache.nixos.org'...
copying path '/nix/store/mkncpjh706pqp21bmz9z5bvw1fk5mlhs-zlib-1.2.11-dev' from 'https://cache.nixos.org'...
copying path '/nix/store/rck7jbb937pr6sv648y4vfl650s982sf-llvm-7.1.0' from 'https://cache.nixos.org'...
copying path '/nix/store/jp0bhf9dxx9n324hm24rr3nhcggib1f2-cctools-binutils-darwin-949.0.1' from 'https://cache.nixos.org'...
copying path '/nix/store/1nzc9kapf7rs7w3qw86jd4xpr971iy92-cctools-binutils-darwin-wrapper-949.0.1' from 'https://cache.nixos.org'...
copying path '/nix/store/0nlwbj5qbdf7r58x2iqz0a17az2j5fdn-clang-wrapper-7.1.0' from 'https://cache.nixos.org'...
copying path '/nix/store/2kq3igrr75pj6nay6phchgn5x1z1f30z-stdenv-darwin' from 'https://cache.nixos.org'...
```

</details>

Most especially these bits here:

```
  /nix/store/1n12bgdza7lysz43xx18if3335h0cz52-tesseract-4.1.1
...
  /nix/store/n1rpna2f6y6dmcj62z43jaj6nv68hwdj-tesseract-4.1.1
...
copying path '/nix/store/1n12bgdza7lysz43xx18if3335h0cz52-tesseract-4.1.1' from 'https://cache.nixos.org'...
...
copying path '/nix/store/n1rpna2f6y6dmcj62z43jaj6nv68hwdj-tesseract-4.1.1' from 'https://cache.nixos.org'...
```



## So What's That All Mean?

> I tested it below to prove tesseract was working, but because this journal is more about learning how to build nix shells and packages I'm writing this part next and leaving the tesseract poking to the very end.

So, it works, but what the heck does this mean?

```
{ pkgs ? import <nixpkgs> {} }:
```

That's pretty obvious: this is the input argument which can have many keys, but here only has one named `pkgs`.

Still not exactly sure how the input args are used exactly, but in this case at least if `pkgs` isn't provided then the default value of the result of `import <nixpkgs> {}` is used instead, so I can assume it's that.

So what's next?

```
with pkgs;
```

Immediately splatting everything from `pkgs` into the local scope.

And then?

```
mkShell {
  buildInputs = [
    tesseract4
  ];
}
```

Ah, a special function.  What's it do exactly?  Apparently it [just provides some defaults for `mkDerivation` so you don't have to when you just want an environment for `nix-shell`](https://discourse.nixos.org/t/mkshell-vs-buildenv/681/2).  That's certainly useful, then.

`buildInputs` seems to be the thing that puts in the actual depnedencies, so since this is basically a shell-centric `mkDerivation` maybe I can check the docs for that?

Given that [dependencies are covered in the 20th Nix Pill](https://nixos.org/guides/nix-pills/basic-dependencies-and-hooks.html), I may want to come back to this at some point.  Or at least, take one pill a day while still messing with what I do know, scraped together from random examples and direct poking.

It seems that it suffices to say:

- `buildInputs` has a list of dependencies, whose bins and lib-paths are added to the derivation.
    - For any terminal environment (like a shell!) this is all we need.
- `propagatedBuildInputs` is like that, but captures all indirect dependencies as well.
    - For libraries, we usually want this?  Probably.


### With `with` Later?

Given the way `with` works, maybe we can hide that later?

```nix
{ pkgs ? import <nixpkgs> {} }:

mkShell {
  buildInputs = with pkgs; [
    tesseract4
  ];
}
```

```
[nix-shell:~/Documents/ocr-tesseract-test]$ tesseract test-images/mtg-tsr-252-firewake-sliver-442dpi-namecropjpeg.jpeg stdout --dpi 442
 

S Firewake Sliver J e I
```

Nice.

This appeases my "minimally pollute namespaces" goblin.  We'll see how long they last.



## Testing With Some Random Cards On Hand

> Conclusion: Yep, it worked.

Obviously I'm only interested in this for ~~childrens card games~~ analyzing my collection.  I expect that this is going to be a bit more involved than some super general image segmentation and text recognition engine, but hey I can hope.

The first issue I ran into was this:

```
[nix-shell:~/Documents/ocr-tesseract-test]$ tesseract test-images/fab-arc-017-aether-sink.jpg stdout
Warning: Invalid resolution 0 dpi. Using 70 instead.
Estimating resolution as 322

(... rest of output omitted for brevity)
```

Ah, right, kinda need to keep that in mind.

After fiddling with the images (they're still much larger than they probably need to be) I ran into another issue:

```
[nix-shell:~/Documents/ocr-tesseract-test]$ tesseract test-images/fab-arc-017-aether-sink-615dpi.jpg stdout --dpi 615
 

s
N

-
bt
.

= RS

%

A
3
b

-
LB
Y

[

Aether Sink enters the arena with a steam counter on it.

(... rest of output omitted for brevity)
```

Where's the card name?

I'm guessing the rest of the header is distracting it, so maybe if we try limiting things to just the top part af the card so it's only the pitch value, name, and cost?

```
[nix-shell:~/Documents/ocr-tesseract-test]$ tesseract test-images/fab-arc-017-aether-sink-615dpi-topcrop.jpg stdout --dpi 615 

(... whole lotta nuthin!)
```

Okay, should've figured all that junk was still distracting, if it was so distracting in the first place.

Just try cropping it down to the name, then?

```
[nix-shell:~/Documents/ocr-tesseract-test]$ tesseract test-images/fab-arc-017-aether-sink-615dpi-namecrop.jpg stdout --dpi 615
Aether Sink

```

Hey, there we go!

So for Flesh and Blood cards at least, I'll want to pre-crop things a bit if I don't want to train more automatic segmenters.  Not surprising I guess.

Let's try an old-border MTG card...

```
[nix-shell:~/Documents/ocr-tesseract-test]$ tesseract test-images/mtg-mh2-392-f,e-step-through-415dpi.jpg stdout --dpi 415
 

' Stcp Through

Sorcery

Return two target creatures to
(... rest of output omitted for brevity)
```

Nice.  There's usually less distractions on the top part of MTG cards, though.  Let's try the modern border, which does have slightly more distraction.

```
[nix-shell:~/Documents/ocr-tesseract-test]$ tesseract test-images/mtg-tsr-252-firewake-sliver-442dpi.jpg stdout --dpi 442
P4 All Sliver creatures have haste.
All Slivers have “1, Sacrifice this permanent:
(... rest of output omitted for brevity)
```

Hm, guess even that border's too distracting.  Okay, try a top crop, though if it didn't work before it probably won't work now.

```
[nix-shell:~/Documents/ocr-tesseract-test]$ tesseract test-images/mtg-tsr-252-firewake-sliver-442dpi-topcrop.jpg stdout --dpi 442
 


[nix-shell:~/Documents/ocr-tesseract-test]$ _
```

Figured.  Name crop should work, though.

```
[nix-shell:~/Documents/ocr-tesseract-test]$ tesseract test-images/mtg-tsr-252-firewake-sliver-442dpi-namecropjpeg.jpeg stdout --dpi 442
 

S Firewake Sliver J e I

```

Ah, much better.

So, cropping down is going to be the best way to go just generally.  Granted, conditioning inputs like that is usually the best way to go.

Now, the real test would be to try running Tesseract on a Raspberry Pi 1.  It runs all spritely on my super fancy laptop, but on a teeny tiny ARM chip?  Probably a little slower, just gonna guess that now.


### What About Different Segmentation Modes?

First I'll try 11: "Sparse text. Find as much text as possible in no particular order."

```
[nix-shell:~/Documents/ocr-tesseract-test]$ tesseract test-images/fab-arc-017-aether-sink-615dpi.jpg stdout --dpi 615 --psm 11
&

3]

et ————————————————————

LM

. S

pomvi i ]

e

o/

¥

FAclvhor Sink

(... Other stuff ...)
```

I think the font is throwing thing off, as I'm not sure what a falcvhor Sink is, but it sound like a Never Ending Story gone very, very wrong.

Also, it took noticeably longer than the default mode:

```
real    0m2.097s
user    0m1.970s
sys     0m0.079s
```

Compared to about 1.6s for the default.

Maybe 4 can work?  ("Assume a single column of text of variable sizes.
")  All the text is more or less in a column...

Sits somewhere between default and 11, though leaning towards default.


### Page Segmentation Mode 6 or 13: Single Line of Text?

If I've already chopped the image down to the name, maybe using PSM 13 that can cut down on execution time?

```
[nix-shell:~/Documents/ocr-tesseract-test]$ time tesseract test-images/mtg-tsr-252-firewake-sliver-442dpi-namecropjpeg.jpeg stdout --dpi 442 --psm 13
L(:_:_]ﬁrewak_e_ﬂiver\,l@@


real    0m0.490s
user    0m0.379s
sys     0m0.083s

[nix-shell:~/Documents/ocr-tesseract-test]$ time tesseract test-images/mtg-tsr-252-firewake-sliver-442dpi-namecropjpeg.jpeg stdout --dpi 442 
 

S Firewake Sliver J e I


real    0m0.346s
user    0m0.258s
sys     0m0.062s
```

Hm.

```
[nix-shell:~/Documents/ocr-tesseract-test]$ time tesseract test-images/fab-arc-017-aether-sink-615dpi-namecrop.jpg stdout --dpi 615 --psm 13
~ Aecther Sink


real    0m0.365s
user    0m0.282s
sys     0m0.061s

[nix-shell:~/Documents/ocr-tesseract-test]$ time tesseract test-images/fab-arc-017-aether-sink-615dpi-namecrop.jpg stdout --dpi 615
Aether Sink


real    0m0.308s
user    0m0.244s
sys     0m0.058s
```

Surprisingly, no.  Maybe 6, then?

Eeeh.  Only marginally better in the low sample set I tried.  Default seems to be the best for speed, amusingly.


### Collector Numbers Consistently Identified

One thing I've noticed is that the collector number, artist name, and copyright consistently come through.

```
iR’ ARCO17 Rachel Alderson © 2020 Legend Story Studios
```

Even identifies the R in the rarity mark!  A common card had its rarity mark identified as an @ though, even though it's clearly a C.  But Tesseract seems to identify the Resource Point symbol as an @ too, which is actually kind a nice.  Not going to work for attack and defense, though... unless they're also identified as @s?

Regardless, the fact that the card metadata is identified consistently means there's actually a very consistent way to identify a card!

If only MTG old borders weren't made so close to the original style that they cut off all that information... on the other hand, it's significantly easier for Tesseract to identify the card names in the old borders, so I guess it's a wash.



## Thoughts on Application to Automated Card Recognition

Since ultimately I want to automate card ingestion because clearly spending weeks off and on doing this is faster than spending weeks off and on doing the actual work (okay, I do learn a lot more), how's this slot into it?

Well, for one thing, the target hardware is going to be significantly more modest than any sort of laptop since it'll probably be a Raspberry Pi, possibly an old one depending on what I've got lying around.

Tesseract may happily munch through an image in about 1.6 seconds on my laptop, but on something as modest as an old Pi that'll probably be much, much longer which means OCR should only be used as a last resort.

Fortunately, there's already other techniques falling under the general umbrella of Perceptual Hashing which, ilke any hash based technique, trades computation time for storage.

OCR can still fit in this though, as it could be used to dynamically update the database with "provisional" card objects, or combined with some API to find the actual card information based off of a name or collector number.  Certainly with Scryfall this is possible, not sure about FaBDB yet.

More importantly, it can add the given image to the current set of perceptual hashes.

Basically:

1. Try matching perceptual hash of image against DB.
    1. If confident match, return match.
    2. Otherwise, continue.
2. Determine TCG type and frame style. (will only support MTG, FAB in variosu treatments for now)
    1. If unknown type/style, error: Unable to indentify TCG type.
    2. Otherwise, continue.
3. Segment card name based on TCG type and frame style.
    - NOTE: Each TCG type and frame style corresponds to one pre-made segmentation set.
4. OCR card name and, if possible, collector number.
    - NOTE: Not all TCG types and frame styles have collector numbers on them.
5. Try matching card to entry in pre-existing data sources.
    1. Try local DB first.  If hit, continue; else try next.
        1. NOTE: These are divided by TCG, using Scryfall for MTG and ??? for FAB.
    2. Try remote DB next.  If hit, continue; else try next.
    3. Create provisional local record with just name.
        1. NOTE: Because OCR is slow, only the name and where possible collector number are run through it.  Anything else is left to as separate process.
6. Update p-hash DB to include new card image with corresponding (possibly provisional) ID
    1. NOTE: All additions should be logged for statistical reasons.
