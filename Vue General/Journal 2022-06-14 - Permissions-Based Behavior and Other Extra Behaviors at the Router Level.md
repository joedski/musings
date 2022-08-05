Journal 2022-06-14 - Permissions-Based Behavior and Other Extra Behaviors at the Router Level
=============================================================================================

Motivating example:

- While many permissions based things involve swapping out buttons or such, sometimes we just want to punt someone back to some "home" or "index" page or throw up a blocker.
- This is especially important when we're loading things on `created` or during initial data reactivity setup.

Going with Vue Router because I'm on an existing project and that's what we're using, it might look something like this:

```js
export const router = new Router({
    base: '/',
    mode: 'history',
    routes: [
        {
            name: RouteName.HOME,
            path: '/',
            component: HomePage,
        },
        {
            name: RouteName.COOL_KIDS_ONLY,
            path: '/cool-kids-only',
            component: permissionsRequired(
                [permissionsChecks.isCoolKid()],
                CoolKidsOnlyPage
            ),
        }
    ]
});
```

Of course, the first thought that comes to mind with these "I probably want more than just 1 of these" so it naturally becomes `Factory -> Component -> Component`, which is just the Higher Order Component pattern... Anyway.

```js
export const router = new Router({
    base: '/',
    mode: 'history',
    routes: [
        {
            name: RouteName.HOME,
            path: '/',
            component: HomePage,
        },
        {
            name: RouteName.COOL_KIDS_ONLY,
            path: '/cool-kids-only',
            component: compose(
                permissionsRequired([
                    permissionsChecks.isCoolKid()
                ])
            )(CoolKidsOnlyPage),
        }
    ]
});
```

Only real issue I think is that this kinda buries the permissions down there.  Sure we can extract it, but do we want to?

```js
export const router = new Router({
    base: '/',
    mode: 'history',
    routes: [
        {
            name: RouteName.HOME,
            path: '/',
            component: HomePage,
        },
        compose(
            permissionsRequired([permissionsChecks.isCoolKid()])
        )({
            name: RouteName.COOL_KIDS_ONLY,
            path: '/cool-kids-only',
            component: CoolKidsOnlyPage,
        }),
    ]
});
```

What else might we want to do?  Required params?  Or just param validation generally?  That seems like a good one, certainly one I prefer to track rather than not.  Explicit interfaces are better than implicit ones, after all.

```js
export const router = new Router({
    base: '/',
    mode: 'history',
    routes: [
        {
            name: RouteName.HOME,
            path: '/',
            component: HomePage,
        },
        compose(
            permissionsRequired([permissionsChecks.isCoolKid()]),
            params({
                query: {
                    target: {
                        type: String,
                        optional: true,
                        default: null,
                    },
                },
            })
        )({
            name: RouteName.COOL_KIDS_ONLY,
            path: '/cool-kids-only',
            component: CoolKidsOnlyPage,
        }),
    ]
});
```

> ASIDE: just remember to define parametric permissions (thing-owner, etc) using a function of a context: `permissionsRequired([thingyOwner(ctx => ctx.$route.query.thingId)])`
> 
> This is necessary because we cannot assume any specific parameter exists on any specific name, nor can we assume it's in either in the query or in the path only.

How does this actually happen, implementation wise?

Whatever you want.

- You could include navigation guards
- You could just wrap the underlying component in HOCs as with the first example
- You probably should at least include some `meta` with each composition
- Very likely 2 or more of the above, really

Of course, you could also just omnibus everything together:

```js
export const router = new Router({
    base: '/',
    mode: 'history',
    routes: [
        createRoute(RouteName.HOME, {
            path: '/',
            component: HomePage,
        }),
        createRoute(RouteName.COOL_KIDS_ONLY, {
            path: '/cool-kids-only',
            component: CoolKidsOnlyPage,
            pagePermissions: [
                permissionsChecks.isCoolKid(),
            ],
            pathParams: {
                // ... etc.
            },
            queryParams: {
                target: {
                    type: String,
                    optional: true,
                    default: null,
                },
            },
        }),
    ]
});
```

Which is convenient, but also runs into some of the same issues of the Vue Object Config Component style, in that it can be rather restrictive in unintended ways that simply composing everything isn't.

But as long as your omnibus helper is actually a composition of the above utils, then you can just create another one if you like, so it's a bit of a non-issue here.
