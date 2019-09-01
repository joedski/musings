Journal 2019-08-31 - TSOP38238-Based Proximity Detector - Can the ATTiny85 Do It?
========

> SPOILERS: Not with the same code, and may require more supporting code and/or hardware, but probably doable.

There's [a Vishay tech note demonstrating fast proximity detection using the sort of IR sensors commonly seen in signal receivers for remotes](http://www.vishay.com/docs/82741/tssp4056sensor.pdf).  They use a TSSP4056, but it works with any such IR sensor.  I used the 38kHz TSOP38238, which is considerably slower, but not slow enough to make a difference.

I'd like to break things into submodules, and as of writing I have 2 [Adafruit 3V Trinkets](https://www.adafruit.com/product/1500) sitting around that I'd really rather make use of sooner than later.  Using it as a peripheral sensor rather than the main brain would be cool, but before I can consider that, I need to know if it has the timers and oomph to do so.

I also have 3 knockoff Arduino Pro Minis sitting around, two not even unwrapped, so I'm not sure why I'm being so precious about them.



## MCUs and Timers

First, we need to know what each board uses:

- The (knockoff) Arduino Pro Minis and the genuine Unos I have use ATMega328P.
    - The Unos have -PU ICs in huge PDIP format.
    - The Pro Minis have -AU ICs in a much tinier SMD format of some sort.
    - All of these are 5V boards.
- The old obsolete Trinket 3v uses an ATTiny85 at 3.3V.

Okay, so first important question: Clock speed.  Not directly applicable, but certainly important.

- ATTiny85, 3.3V Operation: 8 MHz
- ATMega328P, 5V Operation: 16 MHz

Other important question: Timers and their capabilities.

- ATTiny85:
    0. 8-bit Timer with PWM
        - It does some timery things, but no input-capture.
    1. 8-bit Timer
        - Doesn't even get a feature list.  Harsh.
- ATMega328P:
    0. 8-bit Timer with PWM
        - It's a timer.
    1. 16-bit Timer with PWM
        - NOTE: This gets used for input event capture.
        - One input-capture unit.
        - Input capture noise-canceler.
        - External event counter.
        - Etc.
    2. 8-bit Timer with PWM and Asynchronous Operation
        - NOTE: This gets used for carrier signal generation.
        - Overflow and Compare Match Interrupt Sources.

So, yeah, the lack of an input capture unit on either timer means, at least as far as a relatively-straight port, no can do.



## Any Other Interrupts on the ATTiny85?

The timers don't have an input capture unit, and certainly no noise canceler which will be annoying.  How about just plain rising/falling edge detection elsewhere?

Looking at the Interrupts section, I see the following that might be useful:

- INT0: External Interrupt Request 0
- PCINT0: Pin Change Interrupt Request 0

Let's look at those, then.

Reading further in the interrupts section, we see the following general description (paraphrased):

> The External Interrupts are triggered by the INT0 pin or any of the PCINT[5:0] pins. … Pin change interrupts PCI will trigger if any enabled PCINT[5:0] pin toggles. … Pin change interrupts on PCINT[5:0] are detected asynchronously. This implies that these interrupts can be used for waking the part also from sleep modes other than Idle mode.
>
> … Note that recognition of falling or rising edge interrupts on INT0 requires the presence of an I/O clock, described in “Clock Systems and their Distribution” on page 23.
>
> Page 49, ATTiny25/45/85 Data Sheet

So, INT0 looks like the most promising, but first I should read further on the Pin Change Interrupts first before making that judgement call.


### Registers: General Interrupt Mask Register (GIMSK)

The two most important register bits for interrupts are noted here:

> - **Bit 6 – INT0: External Interrupt Request 0 Enable**
>    - When the INT0 bit is set (one) and the I-bit in the Status Register (SREG) is set (one), the external pin interrupt is enabled. *The Interrupt Sense Control0 bits 1/0 (ISC01 and ISC00) in the MCU Control Register (MCUCR) define whether the external interrupt is activated on rising and/or falling edge of the INT0 pin or level sensed.* Activity on the pin will cause an interrupt request even if INT0 is configured as an output. The corresponding interrupt of Exter- nal Interrupt Request 0 is executed from the INT0 Interrupt Vector.
> - **Bit 5 – PCIE: Pin Change Interrupt Enable**
>    - When the PCIE bit is set (one) and the I-bit in the Status Register (SREG) is set (one), pin change interrupt is enabled. Any change on any enabled PCINT[5:0] pin will cause an interrupt. The corresponding interrupt of Pin Change Interrupt Request is executed from the PCI Interrupt Vector. PCINT[5:0] pins are enabled individually by the PCMSK0 Register.

So, while any Port-B pin can technically be used for this purpose, INT0 will be the best suited due to being able to explicitly set whether you want the interrupt triggered on rising or falling edges.  Or both!  It'll just require some manual noise cancelation to match the performance of Timer 1 on the ATMega328P.


### Pins: INT0, OC0x

Pin wise, looks pretty good really:

- PB2 is INT0
- PB1 is OC0B
- PB0 is OC0A

I only looked at OC0x since Timer 1 doesn't mention PWM as a feature, and that's kind of the point of this.



## Communications?

So, one problem with having so few pins, only 6, is that it limits options for communication.  Seems like I'd have to bitbang something on the other 4 pins, what with PB2 being used for input interrupts and PB1/PB0 being used for carrier generation.

Oh well, I guess.



## Summary Of Findings

It's feasible, but requires a bit of extra work:

- Since input interrupt is probably doable, but with caveats:
    - It isn't tied to a timer, we don't get a free timestamp, which means we're possibly a bit more prone to timing errors.  I'm not sure that's too material to this use case, but it may be something to study further.
    - It also doesn't have a 4-system-clock-tick noise-mitigation system built in, which means we'd either need to add some code our selves or condition the input before it reaches the pin.  Simple RC + Schmitt Trigger setup would probably do.
- Carrier generation is probably doable:
    - The original ATMega328P example code, written by someone who presumably actually does among other things MCU stuff for a living, uses Mode 5 on Timer 2: Phase Correct PWM.  Timer 0 on the ATTiny85 has that same mode available (with the same number, 5, no less).
    - Both ATMega328P Timer 2 and ATTiny85 Timer 0 are 8-bit, so that's fine.
    - The original ATMega328P example code also uses a prescaler of 64.  Since the ATTiny85 running on 3.3V is set by default to 8 MHz rather than the 16 MHz the ATMega328P running on 5V is set to, using a prescaler of 32 should allow the  rest of the math to be the same.

In the long term, if I have time, then it may be worth investigating.  In the nearer term though, I'd probably be better off actually using one of the way-too-many Arduino Unos or Pro Minis I have just laying around doing absolutely nothing.
