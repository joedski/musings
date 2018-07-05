Something Better than Percent Changes for Representing Value Changes over Intervals?
====================================================================================

There's an issue with the usual representation of growth as percentage: It doesn't reflect the absolute magnitude well, it's simple, but misleading.  On the other hand, any additional complexity necessarily divorces the output number from the input value.

There's also a problem representing the change when you go from 0 to any amount.  Did you go from 0 to 100 hits?  0 to 100000 hits?  0 to just 1 hit?  Percent change is `(v1 - v0) / v0`, which presents a problem when `v0` is `0`: The result is undefined.  You could say you have an infinite growth!

On the other hand, if you grow steadily, that percent number goes down.  You may be adding people at a linear rate, but since the proportion between values is decreasing, it looks like your growth is slowing.  Constant 5% growth is exponential, since you want the next value to always be 1.05 times the previous.  If you're getting 100 more hits every day versus the previous, that proportion keeps on shrinking because while (200 - 100)/100 is +100%, (1100 - 1000)/1000 is only +10%.  There's still that 100/0 which gives you +Infinity% which is, well, meaningless.

The only real way to get a linear growth is to just compare linearly.  You still get `+100 users` whether it's 100 -> 200 or 1000 -> 1100.

Maybe a more useful measurement would be the log10 of the difference?  Or more precisely:

```
growth ∆v =
  if abs(∆v) <= 1: ∆v
  else:
    sign(∆v) * (1 + log10(abs(∆v)))
```

Really it's meant to be used with discrete values, but I made it linear below 1 anyway.

We can then see the following examples:
- 0 growth, static, is 0.
- 1 over the previous value is 1.
- 10 over the previous value is 2.
- etc.

Logarithms aren't defined below 0, and quickly shoot off towards negative infinity as you approach 0, so they're not really defined at 0 either, hence the above jiggery pokery with `sign` and `1 + ...`.

So, it's sorta semi-log.  Negative numbers do mean contraction (negative growth, not birth), and positive numbers do mean growth, but gaining a constant amount doesn't change your growth number.

I suppose if we wanted to capture both the linear growth and change in growth, we could just apply it twice: `f(∆v); f(∆f(∆v))`

Perfectly linear growth will have a second value of 0, since growth is constant, while exponential growth will have a positive second value, although it will tend to be quite small since this is log10.

Hm.  Very small numbers tend to be kind of hard to understand, just as hard as very large numbers, but what sizes of numbers are meaningful can vary with context.



## All Said and Done: Percents Anyway?

The most meaningful might just be to show the percent along side the first difference. (coarse first derivative)  Perhaps the second difference (coarse second derivative) might also be helpful, too?  Percents (ratiometric values) lie, hence the need for plain-difference values as well.

Percent growth is good to know, but really pretty useless without the broader context: Percent growth relative to what starting value?

We could get both I suppose by using scientific notation.
