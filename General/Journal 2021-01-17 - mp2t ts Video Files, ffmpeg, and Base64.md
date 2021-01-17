Journal 2021-01-17 - mp2t ts Video Files, ffmpeg, and Base64
========

Not much to say here.

When I pulled down a `.ts` video file with Firefox, I wasn't quite sure what to do with it.  It looked like an ASCII file, specifically Base 64 encoded, which I guess was neat.  It wasn't until I checked the HAR that it seems Firefox presented it to me so encoded, and that to get the actual `.ts` video file I needed to decode it.

Fortunately, Macs do have `base64`, which I guess was an old enough utility it made it in.  That makes things simple enough.

```sh
base64 --decode < video.ts.base64 > video.ts
ffmpeg -i video.ts video.mp4
```

Perhaps if I download them directly instead of by copying the response from Firefox, I could skip the decode step?



## Multiple Files?

What if I saw in the `.m3u8` file that the video was actually multiple `.ts` files that get concatenated together?

Okay, for one, I should probably script something to curl all of them so I don't have to keep right clicking, and possibly saving a base64 decode step, but how do I tell ffmpeg to put them together?

Using a [concatenation feature](https://trac.ffmpeg.org/wiki/Concatenate), neatly summarized in [this SO answer](https://superuser.com/a/1162353).

Supposing I have them named in sequence:

```sh
# NOTE: no leading "./"!  ffmpeg considers those unsafe!
for x in video-*.ts; do echo "file '$x'" >> video.txt; done
ffmpeg -f concat -i video.txt -c copy video.mp4
```
