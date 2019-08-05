Journal 2019-08-05 - Synching Versions in Package and Package Lock And Dist Package Files
=======

Two issues here:

- Some people don't use `npm version` when bumping the package version, which is ~~dumb~~ odd.  ~~(I've never done that myself ever ha ha)~~
- We have a separate `dist/package.json` for our build artifact which contains only the depenencies absolutely necessary to run the end product, not to build the UI.  (Bundled code is written to there, and that's then all slurped up into a docker container.)

Ideally what would happen is:

- `npm version ...` is run
- The `version` hook is called, which does the following:
    - Synchronizes `package-lock.json` by running `npm install --ignore-scripts` just to be sure it's up to date.
    - Subsequently synchronizes `dist/package.json` (we don't use `dist/package-lock.json`.)

However, that only works if you use `npm version`, rather than editing the package.json manually.

There's two ways to go about this, then:

1. Add a pre-commit script that updates the various files (runs `npm install --ignore-scripts` if `package.json` and `package-lock.json` differ in the `version` field, then updates `dist/package.json` if that also differs.)
2. Add a pre-commit script that checks that all those files match and emits an error if the `version` fields of `package.json` and `package-lock.json` differ, then if there was no error updates `dist/package.json` if it differs.

I think I'll do 2, just to ensure:

- that people know about `npm version ...`
- that the version commits all follow the same pattern of `v[0-9]+\.[0-9]+\.[0-9]+(?:-extra-stuff)?`.

I think that assuages my concerns for leaning towards 1.  Using the available tooling for consistency is always a win, even if we don't use git tags for version on the project this came up in.

That decided, it's simple:

- The `version` hook remains as is, since we don't want to spam `npm install` (not that we would, since it'd only happen if `package.json` and `package-lock.json` disagree)
- A new script is added that does the following (as stated above):
    1. Do `package.json:version` and `package-lock.json:version` agree?
        - No: Say "package.json and package-lock.json disagree on what the package version is.  Make sure you use 'npm version ...' when bumping versions to ensure consistency in versioning behavior and commit messages." and exit with an error code.
        - Yes: Continue.
    2. Update `dist/package.json:version` to match `package.json:version`.
