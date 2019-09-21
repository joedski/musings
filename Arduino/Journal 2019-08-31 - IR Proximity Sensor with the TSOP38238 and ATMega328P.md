Journal 2019-08-31 - IR Proximity Sensor with the TSOP38238 and ATMega328P
========

It would've been better to get 56kHz components, as shown below, but what I got will work, though not as well.  But, it should work well enough, and that's the important part.  That and I want to use what I've got to cut down on just buying all these extra parts.

This is work based on the [Vishay App Note on Fast Proximity Sensing](http://www.vishay.com/docs/82741/tssp4056sensor.pdf).



## Range-Finding - Outline of Operation

The process described in the app note is successive approximation, which is a more general way of saying a binary search of the input space.  I'll reproduce it here in outline form since I don't feel like drawing ASCII charts:

- Initial state:
    - High = OCR2A Upper Bound (Derived from far-off-f0)
    - Low = OCR2A Lower Bound (Derived from near-f0)
    - Try = Lower Bound (Start at farthest distance/most sensitive)
    - Count = 8
- Initial reading:
    - Take single reading.
    - Received a response?
        - No: Return "No Reading".
            - NOTE: If you were doing this distance sense as the only thing on your board, you can just wait here and block the main loop until you actually detect something by just not decrementing.
        - Yes:
            - Break initial reading.
- Main loop:
    - Update state:
        - Try = Low + (High - Low) / 2
        - Count -= 1
    - Take a reading.  Received?
        - Yes: Range closer by contracting our window away from the center frequency.
            - Low = Try
        - No: Range farther by contracting our window towards the center frequency.
            - High = Try
    - Is Count 0?
        - No: Next iteration of main loop.
        - Yes: Break main loop.
- Result:
    - Try = Low + (Hi - Low) / 2
    - Result = (Try - Lower Bound) * 100 / (Upper Bound - Lower Bound)
        - Result is a value 0 ~ 100, where
            - 0, meaning we had to stay near f0, means the thing sensed is far away.
            - 100, meaning we could go quite far from f0, means the thing sensed is near by.
    - Return Result.

As also noted in the note, this only works over monotonic sensitivity ranges, meaning that in the given range of frequencies the sensitivity must only either rise or fall, never both.  Linearity isn't really important here unless you want that.  While values can be normalized, for rough estimates it's not that bad.



## Using the TSOP38238: Is 38kHz Workable?

So the original app notes use the TSSP4056, which of course uses a carrier at 56kHz.  This gives us a nice tidy set of values for the lower and upper bounds of Timer 2's OCR2A:

- OCR2A Lower Bound = Clock / 2 / f_upper
- OCR2A Upper Bound = Clock / 2 / f_lower

We first divide the Clock by 2 because we're using Mode 5, Phase Correct PWM, so first the counter counts up from 0 to OCR2A, then counts back down.  This is fortunate for us because the lowest non-1x Prescaler value is 8x, which doesn't work so well...

Now, in the app note, they go from (just below) the center frequency f0 = 56kHz to f_lower = 0.56x 56kHz:

- f_upper = 0.95 * 56kHz = 54kHz
- f_lower = 0.56 * 56kHz = 32kHz

Which gives us these OCR2A values:

- OCR2A Lower Bound = Clock / 2 / f_upper
    - = 16e6Hz / 2 / 54e3Hz
    - = 148
- OCR2A Upper Bound = Clock / 2 / f_lower
    - = 16e6Hz / 2 / 32e3Hz
    - = 250

This gives an input space of 102 values to cover.

What do we get at 38kHz, though?

- f_upper = 38kHz * 0.95 = 36kHz
- f_lower = 38kHz * 0.56 = 21.3kHz

And our OCR2A values?

- OCR2A Lower Bound = Clock / 2 / f_upper
    - = 16e6 / 2 / 36e3
    - = 222
- OCR2A Upper Bound = Clock / 2 / f_lower
    - = 16e6 / 2 / 21.3e3
    - = 375

Uh, oops, that's a bit of a problem.  while 222 is a bit high for comfort, 375 is just a wee bit way to far beyond 255, and only Timer 1 is 16 bit, the other timers are 8 bit.

Okay, well, how about going higher, then?  That'll cut our input space in half, but it's better than, well, having basically no input space at all.  Or using the 8x prescaler, which amounts to basically the same thing.

Now, I don't know the actual practical range of monotonicity, so I'm just going to assume 1.3x f0 is the highest for that, even though that only gives a sensitivity of 0.2x baseline instead of 0.16x baseline.

- f_lower = 38kHz * 1.05 = 40kHz
- f_upper = 38kHz * 1.3 = 49.4kHz

And the ORC2A values?

- OCR2A Lower Bound = Clock / 2 / f_upper
    - = 16e6 / 2 / 49.4e3
    - = 161
- OCR2A Upper Bound = Clock / 2 / f_lower
    - = 16e6 / 2 / 40e3
    - = 200

This gives us a much less impressive input range of 200 - 161 = 39.  So, I'm at a bit under half the resolution of the 56kHz sensor, but it's workable.  Doable, but 56kHz would be better.  Or, an empirical test to see if I can go higher than 1.3x 38kHz would be good, too.


### Revised Outline of Operation

The control flow has to be flipped upside down since now the Lower Bound is f0(ish) and the Upper Bound is the off-center frequency.

- Initial state:
    - High = OCR2A Upper Bound (derived from near-f0)
    - Low = OCR2A Lower Bound (derived from far-off-f0)
    - Try = Upper Bound (Start at farthest distance/most sensitive)
    - Count = 8
- Initial reading:
    - Take single reading.
    - Received a response?
        - No: Return "No Reading".
            - NOTE: If you were doing this distance sense as the only thing on your board, you can just wait here and block the main loop until you actually detect something by just not decrementing.
        - Yes:
            - Break initial reading.
- Main loop:
    - Update state:
        - Try = Low + (High - Low) / 2
        - Count -= 1
    - Take a reading.  Received?
        - Yes: Range closer:
            - High = Try
        - No: Range farther:
            - Low = Try
    - Is Count 0?
        - No: Next iteration of main loop.
        - Yes: Break main loop.
- Result:
    - Try = Low + (Hi - Low) / 2
    - Result = 100 - (Try - Lower Bound) * 100 / (Upper Bound - Lower Bound)
        - Result is a value 0 ~ 100 where:
            - 0, meaning we had to stay near f0, means the thing being sensed is far away.
            - 100, meaning we could stray far from f0, means the thing being sensed is close up.
    - Return Result.


### A Better Way to Write It?

- Initial State:
    - Farbound: OCR2A Bound derived from near-f0.
        - Here, Farbound is greater, since near-f0 is lower.
    - Nearbound: OCR2A Bound derived from far-from-f0.
        - Here, Nearbound is lesser, since far-from-f0 is higher.
    - Far = Farbound
    - Near = Nearbound
    - Try = Farbound
        - Start at the most sensitive to detect if anything at all is in range.
    - Count = 8
- Initial Reading:
    - Take a reading.  Received?
        - Yes: Continue to Main Loop.
        - No: Return "No Reading".
- Main Loop: While Count > 0
    - Update State:
        - Try = Nearbound + (Farbound - Nearbound) / 2
            - NOTE: This, if Farbound > Nearbound.  Otherwise, exchange their places in the above equation.  Technically, they're equivalent if using signed math, but unsigned math may cause issues.
        - Count -= 1
    - Take a reading.  Received?
        - Yes: Range closer:
            - Far = Try
        - No: Range farther:
            - Near = Try
- Result:
    - Try = Nearbound + (Farbound - Nearbound) / 2
    - Result = 100 - (Try - Nearbound) * 100 / (Farbound - Nearbound)
        - NOTE: This, if Farbound > Nearbound.  Otherwise, remove the "100 -" part at the front.  This wouldn't be necessary if using signed math, but with unsigned math the results may get funky.
