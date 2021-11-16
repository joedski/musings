Journal 2021-11-06 - Implementing a Self-Updating Card Recognition Pipeline - Card Sorter Machine
==============================================================================================

Goals:

1. Foremost, it should actually recognize known cards.
2. Next, where possible it should do so pretty performantly on modest hardware, like a Raspberry Pi of some sort.  Preferably t < 1s per known card.  (Not yet sure if I can do this for older models...)
3. Ideally, it will be able to OCR the name of an unknown card and either match that against an object in a card DB such as a dump from Scryfall or Gatherer for MTG.
    1. In cases where no sufficiently satisfactory match is found a stub entry is generated from the OCR'd name.  Fully ingesting the total card text is explictly not a goal of this project; rather only recognition of cards is the goal.
        1. Nice to Have: make a request against a card DB service to try to update the local DB.  More thorough would be to just pull the local DB, and OCR results aren't always perfect meaning being able to search with a string-distance threshold instead of always a strict search would be better.
    2. Note that this step is the most likely to require less modest hardware, though Pi 3s have become quite immodest indeed so to speak...

Sources:

1. Mikonen's blog post on his recognizer: https://tmikonen.github.io/quantitatively/2020-01-01-magic-card-detector/
2. Mikonen's repo: https://github.com/tmikonen/magic_card_detector



First Thoughts
--------------

Mine is going to be simpler than a number of other scanners, because I'm assuming the cards will already be in an idea position and angle relative to the camera since my use case is a purpose built card scanner and not a hand held camera.  As such, I don't need to bother with trying recognize warped cards.

I think this might work for a first process:

1. Normalize image.
    1. Resize, we don't usually need super high res images.
    2. Normalize lightness using CLAHE.
2. Try matching against known entries:
    1. Try an Average Hash.
    2. If multiple candidates, try picking from those with a Perceptual Hash.
    3. 0 candidates indicates a complete hash miss.  More than one different game-piece candidate at this point indicates collisions.
        1. NOTE: I distinguish between "game-piece" and "unique card" as one "game-piece" could have had many different printings in different sets, different artworks, or different styles.
3. If multiple "unique card" candidates are found, try to determine set.
    1. Try to identify set name or code. (NOTE: via hash of crop where possible.)
    2. Failing that, try to identify symbol if present. (NOTE: via hash of crop where possible.)
    3. If unable to sufficiently narrow things down, return all candidates.
4. If no candidates, try OCR:
    1. Try to identify game and frame-style based on appearance.
    2. If game and frame-style are not recognized, abort.
    3. Try to identify card bounds.
    4. Use hard-coded boxes per game/frame-style to crop image to card name and possibly collector number and/or artist if the identified frame-style has that information.
    5. OCR cropped text.
    6. Try to identify card using local DB based on game.
    7. Failing that, try to identify card using remote service based on game, and save match to provisional-local DB if found.
    8. Compute any un-computed hashes for card image and save them to local hash DB.

That's a bit much to try in 1 go, so the actual-actual first will be something like:

1. Normalize image.
    1. Resize, we don't usually need super high res images.  If this can be done during image capture, even better.
        1. NOTE: The "normal" size used by Scryfall is 488x680, and that seems to work well enough.
    2. Normalize lightness using CLAHE.
2. Try matching against known entries:
    1. Try an Average Hash.
    2. If multiple candidates, try picking from those with a Perceptual Hash.
    3. If there are 0 candidates, there's a complete miss.
        1. NOTE: I distinguish between "game-piece" and "unique card" as one "game-piece" could have had many different printings in different sets, different artworks, or different styles.
    4. If there are multiple different game-piece candidates at this point, there are hash collisions.
    5. If there are multiple unique-card candidates but they are all the same game-piece, then just return all candidates.


### Building the DB

The steps to building the DB are similar, just instead of trying to match them we're starting with existing cards and just following the Normalize and Compute Whatever Hash steps.

I suppose theoretically we could break that into multiple things such that we could support arbitrary numbers of matching criteria, but eh.  Maybe if I actually need to get more complicated.

The problem with trying to build a system that supports arbitrarily swappable hashing-or-other-identifier strategies is that we'd have to then compute all that data from canonical sources before we could actually match against anything... and in all likelyhood, we're not going to be swapping these things out on a whim.

And considering that there's 25 x 200 x 4 = upwards of 20,000 or so cards to deal with... yeah.

Any changes to the hashing that we try will take a looooong while to recompute.

During testing I'm going to stick 1 or 2 sets I have a decent number of cards from, which at the time of writing means MID, STX, KHM, or AFR.

#### Fast Recognition Strategies: Hashes

That's not to say I can't organize each hashing thing into their own strategy class, just that trying to eagerly build some fancy system around them is probably wasting time.

Rather, it's worth thinking about what exactly we care about for any sort of "quick identification" thing, which in this particular case just means hashes.

Basically, each strategy has 2 operations:

1. Compute Recognition Data
2. Candidacy Confidence: How Likely are These Recognition Data a Match to Those Recognition Data

Some strategies may actually have a binary result for the confidence check, but usually it'll be a float.

#### Further Overthinking: Hashes and OCR under the same interface?

At the risk of bikeshedding, I wonder if OCR can also be fitted under the same general interface?

Thinking about it, there's actually 3 (potential) operations:

1. Compute Recognition Data
2. Narrow Card Candidacy by Comparing Recognition Data
3. Save Recognition Data to DB

Amusingly, OCR has the most expensive step 1 but also the easiest to understand, so there's that?

Not sure if that's how things will ultimately work out, but at least this has been a meditation on what's needed for each aspect, and also reminds me that despite the complexity of the OCR process itself the rest of the application doesn't actually care much about its specifics.

#### What Are We Actually Storing In There?

There's a few things we need:

1. Some sort of primary key.  Probably a "name" of some kind.
2. The hash data, of course.  That's the other most important part.
3. Some metadata so we don't need to make keys into special strings.
    - Game, ID in External DB, Card Name and maybe some other things handy to know.
    - Natural Key will probably be "Game + ID", and will probably just be called "key".

Hm.  Item 3 might obviate item 1, since all we care about is if this card matches things.  In fact, Item 3 might actually comprise Item 1 among the rest of that data, so maybe that doesn't matter as much.

A primary key is mostly just to have a handy reference.  Maybe the DB is implemented a dict and we use the primary key also as the dict key?  That would make the primary key very primary indeed.

Well, really it's more like the dict is an index on the ID field, but that ID is our own internal ID.  It'll probably be some kind of Natural Key which here could be done by combining the Game and the External-DB-ID.

So that in mind, we'll rewrite the above as:

1. Primary Key, which here is a Natural Key computed from Game + External-DB-ID.
2. Identification Data, which is a bunch of image hashes by strategy name.
3. Metadata, including...
    - Natural Key, computed as noted above.
    - Game, because ideally we'll target that at some point, and it's needed for the Natural Key.
    - Name, for human reasons.
    - External DB Name, because we're building off of others' work.
    - External DB Item ID, because a URI ain't compelete without the individual identifier.
        - I suppose we could also include an actual External DB URI somewhere but eh.  For now, it's enough that we have sufficient data to index into a known local copy of an external dataset.

I suppose if we really wanted to, we could do it as a 2-step process and just construct the records (2 + 3) first _then_ build the index-on-primary-key (1).  Something to think about when I have to figure out organizing data by broader categories in order to narrow things down from 20,000+ to hopefully just a few hundred.  We'll see.  (I mean, it might actually end up less efficient but eh.)

> NOTE: The above will also mean we'll want to rewrite any filters we have to return _any_ items that have a certain confidence of match, not just the _most_ confident.  Then, we could pick the highest score or something I dunno, it depends on what we're trying to do.
> 
> If all we want is a card name, and all found objects are the same card name, then we've successfully identified what it is.  But if we need exact object identity, then we'll need more work.

One thing to note that's important is the original images are _not_ kept in the DB.  Those are needed to create the identification information, but are left elsewhere afterwards.  We don't want to load all of those into memory every time we want to identify cards!

This means data wise we'll want to compute all the identification stuff from the original but keep it separate.

So something like

```python
# Stored in the DB.
class ImageReferenceRecord:
    def __init__(
        self,
        natural_key: string,
        path: Path,
        game: string | None = None,
        name: string | None = =natural_key,
        external_db_name: string | None = None,
        external_db_item_id: string | None = None
    ):
        self.natural_key = natural_key
        self.path = path
        self.game = game
        self.name = name
        self.external_db_name = external_db_name
        self.external_db_item_id = external_db_item_id

        self.identification_data = dict()

# Used during creation of reference data, not kept afterwards.
class ReferenceImageData:
    def __init__(
        self,
        path: Path,
        image,
        reference: ImageReferenceRecord
    ):
        self.path = path
        self.image = image
        self.reference = reference
```


### Do We Actually Need a DB Proper?

We do need to hold at least a list of items, but do we really need a fancy repo thing?

Only thing I can think of is to just to encapsulate the reading from and writing to disk.  However, I'm thinking that eventually we'll want some minimal amount of validation in there as well, at least some way to determine that we're actually unpickling data in the expected shape.

Probably best to just aggressively keep concerns separate and compose things to see what groupings fall out.


### Image Normalization: CLAHE (Contrast-Limited Adaptive Histogram Enhancement)

Perhaps it was coined by someone in a language other than English, or maybe that's not quite the correct expansion.  Anyway, the one I'm starting with is a Contrast-Limited Histogram based adjustment, and is pretty simple:

1. Get LAB conversion of image.
2. Apply correction to L channel.
3. Get original-channels conversion of adjusted LAB image.

> NOTE: OpenCV uses BGR as its normal channels and order.

I'll start by using `cv2.createCLAHE(clipLimit = 2, tileGridSize = [8, 8])` as the exact normalization, since that was used by Mikonen.

Eventually I might try to incorporate the color channels in some way, though I'm not sure about applying CLAHE to them, and color is usually relatively stable.  Usually.

In a single trial, which of course doesn't mean much in the grand scheme of things, applying that CLAHE to both the reference images and the target image prior to hashing them increased the statistical distance between the least-different reference and the rest of the references from 5.7something to round about 11, which is very nice indeed.



[mikonen-blog]: https://tmikonen.github.io/quantitatively/2020-01-01-magic-card-detector/
[mikonen-repo]: https://github.com/tmikonen/magic_card_detector
[hackerfactor-average-hash]: https://www.hackerfactor.com/blog/?/archives/432-Looks-Like-It.html
