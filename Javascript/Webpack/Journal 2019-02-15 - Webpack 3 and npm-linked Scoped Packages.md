Webpack 3 and npm-linked Scoped Packages
========================================

Dealing with Webpack and npm-link was already a treat without scoped packages, but scoped packages seem to introduce their own special layer of bullshittery.

To start, I was getting the error message `Module build failed: ReferenceError: Unknown plugin "transform-runtime" specified in "base" at 0, attempted to resolve relative to ".../whatever/the/linked/package/is"`.  Fortunately, [someone came up with a solution that works, even if it's pretty annoying](https://github.com/webpack/webpack/issues/1866#issuecomment-384947882).

Now, I was already loading the babelrc into my Webpack config because of Babel respecting `.babelrc` files in dependencies, something which caused no end of frustration, the solution I'm showing here is based around just that setup.

```js
const projectRoot = path.resolve(__dirname)

function loadBabelConfigFromDisk() {
    return // ... load it from .babelrc, .babelrc.js, package.json, where ever.
}

// Explicitly resolve packages in our scope so that local resolution
// doesn't take over in npm-linked depnedencies.
// https://github.com/webpack/webpack/issues/1866#issuecomment-384947882
function fixBabelThings(prefix, things) {
    return things.map(thing => {
        if (Array.isArray(thing)) {
            return [require.resolve(`${prefix}${thing[0]}`)].concat(thing.slice(1))
        }
        if (typeof thing === 'string') {
            return require.resolve(`${prefix}${thing}`)
        }
        return thing
    })
}

module.exports = {
    resolve: {
        // ...
        modules: [
            // This part is the same as theirs, nothing special here.
            path.resolve(projectRoot, 'node_modules'),
        ],
    },
    module: {
        rules: [
            // other rules...
            {
                // ...
                loader: 'babel-loader',
                include: [
                    // ... blah blah blah,
                    // Use a regex for a bit because webpack resolves linked packages
                    // to the actual location on disk.
                    /[\\/]package-name[\\/]/
                ],
                options: Object.assign(
                    (() => {
                        const babelrc = loadBabelConfigFromDisk()
                        // Lock our plugins and presets to the project versions.
                        // https://github.com/webpack/webpack/issues/1866#issuecomment-384947882
                        return Object.assign(
                            {},
                            babelrc,
                            {
                                plugins: fixBabelThings('babel-plugin-', babelrc.plugins),
                                presets: fixBabelThings('babel-preset-', babelrc.presets),
                            }
                        )
                    })(),
                    // Ignore babelrc files in favor of our loaded config.
                    { babelrc: false }
                ),
            },
        ],
    },
}
```
