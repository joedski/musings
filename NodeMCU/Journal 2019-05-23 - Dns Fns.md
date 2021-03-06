Journal 2019-05-23 - Dns Fns
========

I want to write some DNS Functions that can be used anywhere.  Eyes will be on most common use cases, but hopefully broken up to be generically useful and at least relatively efficient.



## First Thought

- I could just generate addresses for each thingy in the message.
- Then use those to read out only the things I care about.

Although good utility wise, it promotes tiny functions, it's also annoying: I have to call a whole bunch of functions just to read the answers!



## Second Thought

- First Thought, but with some conveniences:
    - Iterator that just iterates over Answers of a given Message.
    - ... or over Additional Records.
    - Etc.
    - Or even only Records of Type!

Hmm.

How to go about that?


### Iterating Over Message Items

There's a few things we'll need, regardless:

- The count of each section.
- The address of each item.

The counts are at a fixed location in the Message Header, which is at a fixed location in the Message: The beginning.  First item is trivial, then.

The address of each item is a bit trickier, but mostly because we have to jog over things of arbitrary lengths...

- Domain Names
    - Not as easy, but not that hard, either.
- Record Data Values
    - Easy, because RDLEGTH.

Mostly that's it.


### Extracting Addresses

So, this is mildly complicated no matter how I slice it.

Basically I need to keep track of how many of each thing I've read for anything to make sense.  Thankfully, that's the hard part; past that, it's all delegated to functions.

Thus, I start by reading the entry counts from the header into local state, and go on from there.  Tedious, but not at all difficult.



## How Bout Them Writing Things?

Need to also be able to create DNS Messages, which is mostly Questions, thankfully.  Still, that means domain names, at least.

I've read that creating separate strings is slow, and that doing `strA = strA..strB` repeatedly is the worst, due to how Lua creates new strings.  It's apparently more performant to create a Table and just dump a bunch of strings in there, then do a single `table.concat()` call.  So, I'll do that, then.

Alright, so... how's it work from there?

I don't think I'll bother with compression, since for Name fields at least, that requires scanning over other Name fields, and I don't feel like doing that.

Otherwise, much like how all the Readers take the Message String as their main argument and further parametrize after that, I guess all the Writers will take a Message Table as their main argument.  Or they just return a string, I dunno.


### Thought One

```lua
local message = {
    dnsFns.writeHeader(
        0xbeef,
        0, -- Flags.  Queries can almost always just have no flags!
        -- Counts.  Usually only 1 question, unless you're getting frisky.
        1, 0, 0, 0
    ),
    dnsFns.writeQuestion(
        -- Dot-delimited String or array of strings.
        "datamunch.local",
        1, -- Type = A for Address.
        1 -- Class = IN, pretty much always.
    )
}
local messageString = table.concat(message, '')
```

```lua
local message = {}
dnsFns.writeHeader(
    message,
    0xbeef,
    0, -- Flags.  Queries can almost always just have no flags!
    -- Counts.  Usually only 1 question, unless you're getting frisky.
    1, 0, 0, 0
)
dnsFns.writeQuestion(
    message,
    -- Dot-delimited String or array of strings.
    "datamunch.local",
    1, -- Type = A for Address.
    1 -- Class = IN, pretty much always.
)
local messageString = table.concat(message, '')
```

```lua
local message = {
    header = {
        id = 0xbeef,
        flags = 0,
    },
    questions = {
        dnsFns.writeQuestion("datamunch.local", 1, 1),
        -- or even
        { name = "datamunch.local", type = 1, class = 1 }
    },
}
local messageString = dnsFns.serializeMessage(message)
```

Honestly, if I had to pick one that I liked interface wise, I'd pick the third one, the table-message one, though it does create 4 tables.  The second one would be more flexible, actual serialization wise, since I could entirely decide the implementation, but it's kind of annoying to use.  Of course, it's not meant to be entirely convenient, more it's supposed to provide utils upon which convenience can be built easily.

Hm.

```lua
local message = dnsFns.initMessage(0xbeef, 0)
dnsFns.writeQuestion(message, "datamunch.local", 1, 1)
local messagestring = dnsFns.serializeMessage(message)
```

This isn't too bad, seems like it might be fine-grained enough for writing?  Keeps the message format opaque, more or less.  (it's secretly just a table of strings and numbers.)

The Writers won't be as atomic as the Readers since we're starting with all the information and turning it into a string, rather than reading only bits we care about out of an existing string.  So, perhaps it's not so surprising here that things aren't as fine-grained.

> Aside: `string.char(n, n, n, ...)` is used to create an arbitrary octet string from a bunch of numbers.  Thus: `function serializeUInt16BE(n) return string.char(math.floor(n / 256), n % 256) end`



## Sundry Utilities

Lua 5.1, which NodeMCU uses, doesn't have all those nice bit operations, making any low level things a bit annoying to work with.  The prior `nodemcu-mdns-client` lib had to deal with this, too, so I can scour it for some useful things.


### Reading Raw Octets as Numbers

Strings have a method `:byte(index)` that returns the numeric byte value at the given index.  Remember that Lua is 1-indexed, of course.

Reading a Header is thus actually pretty simple:

```lua
local header = {
    id = message:byte(1) * 256 + message:byte(2),
    flags = message:byte(3) * 256 + message:byte(4),
    qdcount = message:byte(5) * 256 + message:byte(6),
    ancount = message:byte(7) * 256 + message:byte(8),
    nscount = message:byte(9) * 256 + message:byte(10),
    arcount = message:byte(11) * 256 + message:byte(12),
}
```


### Checking for Bits

The lack of bitwise operations is annoying, but there is this trick at least, for checking if a specific single bit is set:

```lua
--- Helper function: check if a single bit is set in a number
-- @param val       number
-- @param mask      mask (single bit only)
-- @return  true if bit is set, false if not
function is_bit_set(val, mask)
    return val % (mask + mask) >= mask
end
```

The flags in a given header are bits, anyway, or at best two bits.  Calling it twice is not bad, and there's no local values, nor upvalue references.


### Extracting a Contiguous Run of Bits.

Admittedly, not really needed for the most common cases here, but I am curious.

- The `is_bit_set` thing works thusly:
    - `val % 0b0100` is the same as `val & 0b0011`.
    - If a `val` is only a single bit, then `val + val` is the same as `val << 1`.
    - Thus, `val % (mask + mask) >= mask` is basically the same as `val & mask != 0` if `mask` is a single bit.
        - e.g. if `mask = 0b0010`, and `val = 0b0111`, then we end up with:
            - `0b0111 % (0b0010 + 0b0010) > 0b0010`
            - `0b0111 % 0b0100 > 0b0010`
            - `0b0011 > 0b0010`
            - `true`

We can use some extensions to that to extract an arbitrary contiguous bit field:

- `val % 0b0100` is the same as `val & 0b0011`.
- `val - (val % 0b0100)` is the same as `val & 0b1100`, or `val & ~0b0011`.
- This being the case, we can extract, say, `0b01111000` thusly:
    - `((val & 0b01111000) >> 3)`
    - `((val & 0b01111111) - (val % 0b00000111)) / 2^3`
    - `((val % 0b10000000) - (val % 0b00001000)) / 8`
        - NOTE: Could use `math.floor()` for extra safety, but power-of-two divisions should hopefully be safe, especially if the value is already a multiple of 8.
        - NOTE: You could use `val // 8` in Lua 5.3, but alas I'm targeting 5.1 or else I'd just use the bitwise operators directly.

Since I don't have Lua 5.3 installed, and I'm lazy, I validated this in JS:

```js
var mask = 0b01111000;

var maskMsb = (mask & ~(mask >> 1));
var maskLsb = (mask & ~(mask << 1));

var val1 = 0b10101010;
var val2 = 0b01010101;

console.log(
    '(val1 & mask) === ((val1 % (maskMsb << 1)) - (val1 % (maskLsb)))',
    (val1 & mask) === ((val1 % (maskMsb << 1)) - (val1 % (maskLsb)))
);
// => true
console.log(
    '(val2 & mask) === ((val2 % (maskMsb << 1)) - (val2 % (maskLsb)))',
    (val2 & mask) === ((val2 % (maskMsb << 1)) - (val2 % (maskLsb)))
);
// => true
```

So, yep.  That works.

Also for good measure:

```js
console.log((0b01111000 / 8) === (0b01111000 >> 3));
// => true
```
