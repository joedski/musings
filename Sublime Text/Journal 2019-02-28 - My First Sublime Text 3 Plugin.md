Journal 2019-02-28 - My First Sublime Text 3 Plugin
===================================================

One thing I like doing in my journals is cross-linking where appropriate, which admittedly isn't often the case.  However, because whitespace is sometimes meaningful in Markdown, really in any flavor, I need to be able to URL-quote the File and Folder names.  `C++` might be misinterpreted as `C  `, for instance, and spaces ... well, don't talk to me about spaces.

Sublime Text 3 uses Python, and Python has `urllib.parse.quote()`.  I could probably install any number of plugins to do that for me, and I'm somewhat surprised Emmet doesn't have that, although it does have the ability to convert an image to a Data URL...  Regardless, the real reasoning is this: this seems like a simple enough thing that it would make a good starter plugin!



## Some Initial Stuff

- Sublime Text 3 Plugin API Reference: https://www.sublimetext.com/docs/3/api_reference.html
    - Includes important things like units and such, too.
- A `View` is the currently focused editor view, where the current buffer is being displayed.
- A `Window` contains many `View`s.
- In the Developer Console (`` ctrl-` ``) the `sublime` package is pre-imported.
- You can get the active `Window` with `sublime.active_window()`.
- You can get the active `View` in a `Window` with `Window#active_view()`.
- `View#run_command(name_str)` runs a `TextCommand` in that `View`.
    - The Name of a `TextCommand` is determined thus: For a `TextCommand` named `FooBarCommand`, the `Command` suffix is stripped and the remainder of the name is converted to `snake_case`, hence: `foo_bar` from `FooBarCommand`.
- So, given their example Plugin `ExampleCommand`, it can be run in the current `View` with this:
    - `sublime.active_window().active_view().run_command('example')`
- `print()` is a function, not a keyword, so it's probably Python 3.
- The example plugin has 2-space indentation, rather than 4-space, for anyone that cares.

So, that gives me a few things:

- I can poke things in the dev console.
- I can also log out the current values given to a text command.

Think I'll start in the dev console.



## What I Want to Do

- Check Current Selection.
    - If 0-length, Exit.
- For Each Selection:
    - Replace Text with `urllib.parse.quote(text)`.
        - Iterate backwards to prevent issues?


### Getting the Current Selection

There is a `Selection` class which is a sorted set of non-overlapping `Region`s.  Docs don't say much more than that, which is annoying.  Let's take a look in the console, then.  We should be able to get one by using the `View#sel()` method.

```python
sublime.active_window().active_view().sel()
# <sublime.Selection object at 0x10c00ae10>
```

Helpful.  Maybe we can use it in a comprehension?

```python
[r for r in sublime.active_window().active_view().sel()]
# [(2881, 2881)]

# After making three 2-character selections:
[r for r in sublime.active_window().active_view().sel()]
# [(2420, 2422), (2449, 2451), (2538, 2540)]
```

Ah hah, so we can!  Excellent.  Also means we can use it in a regular `for` loop, which is probably closer to the use case.


### Getting the Selected Text

This is easy: `View#substr(region)`.  Since a `Selection` is a set of `Regions`, we just feed them in:

```python
current_view = sublime.active_window().active_view()
[current_view.substr(r) for r in current_view.sel()]
# ['Ah hah, so we can!', 'loop, which is probably closer to']
```

Simple, but good to validate.

We'll probably want to keep the `Region` tied to the text since for `View#replace()` to work, we need both, so let's modify that to:

```python
[(r, current_view.substr(r)) for r in current_view.sel()]
# [((3048, 3066), 'Ah hah, so we can!'), ((3124, 3157), 'loop, which is probably closer to')]
```

Much better.


### First Draft

I think, then, something like this should work:

```python
import urllib
import sublime
import sublime_plugin


class QuoteUrlCommand(sublime_plugin.TextCommand):
    def run(self, edit):
        selections = [(r, self.view.substr(r)) for r in self.view.sel()]
        for (selection_region, selection_text) in selections.reverse():
            quoted_text = urllib.parse.quote(selection_text)
            self.view.replace(edit, selection_region, quoted_text)
```

Mostly, anyway.  Need to actually check if that's the best way to do things.

```
TypeError: 'NoneType' object is not iterable
```

Er, right.  `reverse()` doesn't return the list like in JS.  Let's try that again with less herpderp.

```python
class QuoteUrlCommand(sublime_plugin.TextCommand):
    def run(self, edit):
        selections = [(r, self.view.substr(r)) for r in self.view.sel()]
        selections.reverse()
        for (selection_region, selection_text) in selections:
            quoted_text = urllib.parse.quote(selection_text)
            self.view.replace(edit, selection_region, quoted_text)
```

Test text: This is some text with spaces!  And Punctuation...
Result: This%20is%20some%20text%20with%20spaces%21%20%20And%20Punctuation...

Nice, it works!  Now I just need to make it into a menu command.
