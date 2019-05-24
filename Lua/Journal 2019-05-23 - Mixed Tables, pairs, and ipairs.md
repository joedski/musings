Journal 2019-05-23 - Mixed Tables, pairs, and ipairs
========

```lua
t = { 1, 13, 28, questions = 2 }

print("pairs(t):")
for k, v in pairs(t) do
  print("  "..k..": "..v)
end

print("ipairs(t):")
for i, v in ipairs(t) do
  print("  "..i..": "..v)
end
```

Result:

```
pairs(t):
  1: 1
  2: 13
  3: 28
  questions: 2
ipairs(t):
  1: 1
  2: 13
  3: 28
```

So, there's that I guess.
