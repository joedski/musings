Journal 2021-11-14 - Parsing YAML Front Matter in Markdown Files
================================================================

Few issues here, really:

1. How do I parse YAML?
2. Can I parse CommonMark Markdown?  (Or even GFM?)

As of ST3, there's [a few ways to include dependencies with your plugin](https://stackoverflow.com/questions/61196270/how-to-properly-use-3rd-party-dependencies-with-sublime-text-plugins), which is fun.

Fortunately, it looks like at least [yaml is covered with a module for pyyaml](https://github.com/packagecontrol/pyyaml).

The way we specify this as a dependency of our plugin package is by putting this in our plugin package's `dependencies.json`:

```json
{
   "*": {
      "*": [
         "pyyaml"
      ]
   }
}
```

Nice.

If it weren't already installed by some other package I'd have to run the command "Package Control: Satisfy Dependencies", but I can already just hop into the console and directly enter `import pyyaml` and receive no `ImportError` so yeah.

Nice indeed.

As far as markdown... Actually not gonna bother with for the purpose of parsing front matter.  Since I just want tags and possibly other things as my needs expand I really only need that YAML at the front and that's it.

If I wanted to parse it, seems [the module in Sublime Text/Package Manager](https://github.com/facelessuser/sublime-markdown) is [python-markdown](https://python-markdown.github.io/), which is focuses on being compatible with [John Gruber's Markdown](https://daringfireball.net/projects/markdown/).

CommonMark and thus GFM are similar at a surface level, but [as noted in their justification section](https://spec.commonmark.org/0.30/#why-is-a-spec-needed-) the original specification is ambiguous and `Markdown.pl` was itself not the most rigorous.  It mostly worked as described, but the ambiguity in specification meant [other implementations sometimes wildly diverge](https://johnmacfarlane.net/babelmark2/faq.html), which is part of my concern here.

So how to handle the document itself?

Jekyll, which GitHub uses and thus being the entire reason I myself use YAML front matter, [specifies that if you have the YAML front matter then _absolutely nothing must come before those first `---`, not even a BOM_](https://jekyllrb.com/docs/front-matter/), which makes me think it's just checking for the file starting with `---`, then scanning for another line that contains only `---` which is probably like how YAML does it?

Hard coding things like that is fine, right?

Right!

Hah hah.

It is easy, at least, just check for initial `---<EOL>` then scan for `<EOL>---<EOL>` and chuck everything between those two things into the YAML parser.  If it parses, success!



Sketching Things Out
--------------------

After some finnagling and learning that you refer to the installed version of `pyyaml` as just `yaml`, I have this as the "poke things until it works" version:

In `plugin_scratch_markdown.py`:

```python
import sublime
import sublime_plugin
import yaml
import json

class ScratchGetMarkdownFrontMatterCommand(sublime_plugin.TextCommand):
    def run(self, edit):
        first_line_region = self.view.line(0)
        first_line = self.view.substr(first_line_region)

        print('First line:', '[{}]'.format(first_line))

        if first_line != '---':
            print("Probably doesn't contain front matter.")
            return

        print('Maybe contains front matter!')

        yaml_terminator_region = self.view.find('^---$', first_line_region.end())

        if yaml_terminator_region == sublime.Region(-1, -1):
            print("Second YAML document separator not found, abort!")
            return

        yaml_document = self.view.substr(
            sublime.Region(
                first_line_region.end() + 1,
                yaml_terminator_region.begin()
            )
        )

        front_matter = yaml.safe_load(yaml_document)

        print("Supposed YAML document:")
        print("---")
        print(yaml_document)
        print("---")
        print(json.dumps(front_matter))
        print("---")

        if "tags" in front_matter and type(front_matter["tags"]) is list:
            print("Tags:", json.dumps(front_matter['tags']))
        else:
            print("No tags :(")

        print("---")
```

And in `plugin_scratch_markdown.sublime-commands`:

```json
[
  {
    "caption": "Scratch(Markdown): Get Markdown Front Matter",
    "command": "scratch_get_markdown_front_matter"
  }
]
```

Now granted, to be entirely sure about the tags I'd need to check that they're all strings but eh.  Probably just discard strings or at least print rude messages in the console about any non-strings then ignoring them.  Or just throw, it's not as if this is too important.



Sketch: Processing File Contents Directly
-----------------------------------------

The above works only for the current view of course, but not so much for if we want to scan all files at once, or really if we want to check a random file that we can't access via `self.view`.

Given it's a simple regex to check though, it's not like this will be too difficult.

1. We'd always start by just checking the first 4 bytes of the file: if it's `---` followed by `\r` or `\n` then we've got a potential hit.
2. Starting at offset 3 we'd try to find `^---$` and, if we find it, yoink all text starting at offset 3 and ending before the offset of the second document separator.
3. From there it's identical.
