module Main where

import Prelude
import Math (sqrt)

diagonal w h = sqrt (w * w + h * h)

main = logShow (diagonal 3.0 4.0)
