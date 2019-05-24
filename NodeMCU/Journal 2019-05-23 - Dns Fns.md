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


### Bitwise And, Bitwise Or

Admittedly, not really needed for the most common cases here, but I am curious.

- The `is_bit_set` thing works thusly:
    - If `val % 0b0100` is the same as `val & 0b0011`.
    - If a `val` is only a single bit, then `val + val` is the same as `val << 1`.
    - Thus, `val % (mask + mask) >= mask` is basically the same as `val & mask != 0` if `mask` is a single bit.
        - e.g. if `mask = 0b0010`, and `val = 0b0111`, then we end up with:
            - `0b0111 % (0b0010 + 0b0010) > 0b0010`
            - `0b0111 % 0b0100 > 0b0010`
            - `0b0011 > 0b0010`
            - `true`
