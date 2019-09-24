Journal 2019-09-23 - Range Issues? - IR Range Sensor
========

Currently running into issues actually getting it to work at the full extant of its range.


```
A1~C8: C8 (40000.0) |< B4 (44444.4) |< AA (47058.8) |< A5 (48484.8) |< A3 (49079.8) |< A2 (49382.7) |< : A1
100: ====================================================================================================|
A1~C8: C8 (40000.0) |< B4 (44444.4) |< AA (47058.8) |< A5 (48484.8) |< A3 (49079.8) |< A2 (49382.7) |> : A2
 98: ==================================================================================================| |
A1~C8: C8 (40000.0) |< B4 (44444.4) |< AA (47058.8) |< A5 (48484.8) |< A3 (49079.8) |> A4 (48780.5) |< : A3
 95: ===============================================================================================|    |
```

As of yet, I still have not made a shroud for the TSOP itself to stop stray non-forward light from entering, so that may be yet another thing to try.

What I have tried:

- Putting my finger right on the front.
    - Sometimes causes it to range closer.
- Moving my finger around while basically touching it.
- Moving my finger around while being only very close.
- Moving my whole hand around in front of it.
    - This can with some periodic regularity cause nothing to be detected.

Thoughts:

- The TSOP38238 and its ilk are made to work with very faint signals, so it's entirely possible it's seeing reflected light that's bouncing off the ceiling and walls and whatever else, on to whatever else still, which is why only blocking effectively the entire forward angular range with whatever obstruction I can is able to cause non-detections.
    - So, maybe try just blasting out less light?
- Need to take another look at it when I'm more awake, make sure it actually is doing what I want it to do.
- Also need to make sure the output value actually makes sense.


```
A1~C8: C8 (40000.0) |< B4 (44444.4) |< =A1~B4;  AA (47058.8) |< =A1~AA;  A5 (48484.8) |< =A1~A5;  A3 (49079.8) |< =A1~A3;  A2 (49382.7) |< =A1~A2;  : A1
100: ====================================================================================================|

A1~C8: C8 (40000.0) |< B4 (44444.4) |< =A1~B4;  AA (47058.8) |< =A1~AA;  A5 (48484.8) |< =A1~A5;  A3 (49079.8) |< =A1~A3;  A2 (49382.7) |> =A2~A3;  : A2
 98: ==================================================================================================| |

A1~C8: C8 (40000.0) |< B4 (44444.4) |< =A1~B4;  AA (47058.8) |< =A1~AA;  A5 (48484.8) |< =A1~A5;  A3 (49079.8) |> =A3~A5;  A4 (48780.5) |< =A3~A4;  : A3
 95: ===============================================================================================|    |
```

