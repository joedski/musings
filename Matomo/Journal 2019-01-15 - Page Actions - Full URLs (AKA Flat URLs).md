Journal 2019-01-15 - Page Actions - Full URLs (AKA Flat URLs)
=============================================================

For awhile, we've been trying to figure out why Matomo doesn't seem to be reporting full paths or URLs.  Instead, it seems to give things by `page`, `edit`, `admin`, and `/index`, which isn't really all that helpful to us seeing as everything is under `page/*`, `edit/*`, `admin/*`, etc.

I decided to investigate a bit by checking the Matomo admin page.  Surely, they would have examples of the proper requests there, right?

Eeeeh, sorta.  They have their results organized in just the fashion up there:
- `page`
    - `/foo` (full URL: `https://www.example.com/page/foo`)
    - `/bar` (full URL: `https://www.example.com/page/bar`)
- `edit`
    - `/foo` (full URL: `https://www.example.com/edit/foo`)
    - `/bar` (full URL: `https://www.example.com/edit/bar`)
- So on, so forth.

Notably, the subsections aren't fetched until you expand them.

Here's an example API request that would turn up the same information, first a top-level section:

```sh
MATOMO_TOKEN=TotesLegitToken
MATOMO_SITE_ID=12345
MATOMO_HOST=https://metrics.example.com
curl "$METRICS_HOST/?token_auth=$MATOMO_TOKEN&date=today&format=json&module=API&method=Actions.getPageUrls&idSite=$MATOMO_SITE_ID&period=day&search_recursive=1&filter_sort_column=label&filter_sort_order=desc"
```

Params:
- `idSite=$MATOMO_SITE_ID`
- `token_auth=$MATOMO_TOKEN`
- `format=json`
- `period=day`
- `date=today`
- `module=API`
- `method=Actions.getPageUrls`
- `search_recursive=1`
- `filter_sort_column=label`
- `filter_sort_order=desc`

This turns up results for `page`, `edit`, etc:

```json
[
  {
    "label": "page",
    "nb_visits": 908,
    "nb_hits": 2105,
    "sum_time_spent": 145341,
    "nb_hits_with_time_generation": 2105,
    "min_time_generation": "0.001",
    "max_time_generation": "19.679",
    "entry_nb_visits": 551,
    "entry_nb_actions": 2244,
    "entry_sum_visit_length": 140564,
    "entry_bounce_count": 65,
    "exit_nb_visits": 570,
    "avg_time_on_page": 69,
    "bounce_rate": "12%",
    "exit_rate": "63%",
    "avg_time_generation": 0.463,
    "idsubdatatable": 1
  },
  "..."
]
```

Then, when you expand a section, you see something like this:

```sh
MATOMO_TOKEN=TotesLegitToken
MATOMO_SITE_ID=12345
MATOMO_HOST=https://metrics.example.com
curl "$METRICS_HOST/?token_auth=$MATOMO_TOKEN&date=today&format=json&module=API&method=Actions.getPageUrls&idSite=$MATOMO_SITE_ID&period=day&search_recursive=1&filter_sort_column=label&filter_sort_order=desc?idSubtable=1"
```

There's an extra param at the end:
- `idSubtable=1` matching the `idsubdatatable` prop of the `label=page` item in the first results.

This seems to return anything under, in this specific case, `page`, so `page/foo` and `page/bar` going from the above stuff:

```json
[
  {
    "label": "/foo",
    "nb_visits": 1,
    "nb_uniq_visitors": 1,
    "nb_hits": 3,
    "sum_time_spent": 780,
    "nb_hits_with_time_generation": "3",
    "min_time_generation": "0.068",
    "max_time_generation": "0.436",
    "avg_time_on_page": 260,
    "bounce_rate": "0%",
    "exit_rate": "0%",
    "avg_time_generation": 0.195,
    "url": "https://www.example.com/page/foo",
    "segment": "pageUrl==https%3A%2F%2Fwww.example.com%2Fpage%2Ffoo"
  },
  {
    "label": "/bar",
    "nb_visits": 3,
    "nb_uniq_visitors": 2,
    "nb_hits": 14,
    "sum_time_spent": 393,
    "nb_hits_with_time_generation": "14",
    "min_time_generation": "0.006",
    "max_time_generation": "1.326",
    "entry_nb_uniq_visitors": "2",
    "entry_nb_visits": "3",
    "entry_nb_actions": "17",
    "entry_sum_visit_length": "669",
    "entry_bounce_count": "0",
    "exit_nb_uniq_visitors": "2",
    "exit_nb_visits": "3",
    "avg_time_on_page": 28,
    "bounce_rate": "0%",
    "exit_rate": "100%",
    "avg_time_generation": 0.403,
    "url": "https://www.example.com/page/bar",
    "segment": "pageUrl==https%3A%2F%2Fwww.example.com%2Fpage%2Fbar"
  },
  "..."
]
```

Annoyingly, the `label` is just `/foo`, but it seems now that we're setting a custom URL, it's actually returning a `url` property.  Notably, this property is missing on the `page` ones.  Hm.  Matomo seems to be treating `page` separately from, or as an aggregate over, all the items below it.  That... is annoying.

Also annoying, this means we'll have to update the way our main site shows metrics because we're not seeing the URLs we're actually interested in.  I may have to go digging around to figure out if there's a way to do that.  Currently, I don't know about one.

Some searching found an [old issue](https://github.com/matomo-org/matomo/issues/1363) that seems to imply that there may be a "flat URL" search or endpoint.  It was from back in 2010/2011.  [This forum post](https://forum.matomo.org/t/incorrect-actions-page-urls-with-flat-1-option/19094) indicates the way to get that is `flat=1` somewhere.  Where?  Dunno, but I can try just plugging it in.

Is this option in their [Reporting API Docs](https://developer.matomo.org/api-reference/reporting-api)?  It is mentioned there, under the [Optional API Parameters section](https://developer.matomo.org/api-reference/reporting-api#optional-api-parameters), given as the opposite setting to `expanded=1`.  Guess I didn't look to closely at the data or options the first time I was developing the API requests.  That might require a change to the API itself, which means I'll need to request access to that repo, because it's private in another org.

In the mean time, does that actually do what we want?  The above issue and forum post would seem to imply so.  There's no point requesting access if I can't actually fix it satisfactorily.  Let's try it.

[Their docs](https://developer.matomo.org/api-reference/reporting-api#Actions) list it as part of the call signature of `Actions.getPageUrls`:

```
Actions.getPageUrls (idSite, period, date, segment = '', expanded = '', idSubtable = '', depth = '', flat = '')
```

Which is a pretty good endorsement for it working.

```sh
MATOMO_TOKEN=TotesLegitToken
MATOMO_SITE_ID=12345
MATOMO_HOST=https://metrics.example.com
curl "$METRICS_HOST/?token_auth=$MATOMO_TOKEN&date=today&format=json&module=API&method=Actions.getPageUrls&idSite=$MATOMO_SITE_ID&period=day&filter_sort_column=label&filter_sort_order=desc&flat=1"
```

Added parameters:
- `flat=1`

Ah hah, looks like that is what we want:

```json
[
  {
    "label": "/page/foo",
    "nb_visits": 2,
    "nb_uniq_visitors": 2,
    "nb_hits": 4,
    "sum_time_spent": 782,
    "nb_hits_with_time_generation": "4",
    "min_time_generation": "0.068",
    "max_time_generation": "0.436",
    "avg_time_on_page": 196,
    "bounce_rate": "0%",
    "exit_rate": "0%",
    "avg_time_generation": 0.166,
    "url": "https://www.example.com/page/foo",
    "segment": "pageUrl==https%3A%2F%2Fwww.example.com%2Fpage%2Ffoo"
  },
  {
    "label": "/page/bar",
    "nb_visits": 3,
    "nb_uniq_visitors": 2,
    "nb_hits": 14,
    "sum_time_spent": 393,
    "nb_hits_with_time_generation": "14",
    "min_time_generation": "0.006",
    "max_time_generation": "1.326",
    "entry_nb_uniq_visitors": "2",
    "entry_nb_visits": "3",
    "entry_nb_actions": "17",
    "entry_sum_visit_length": "669",
    "entry_bounce_count": "0",
    "exit_nb_uniq_visitors": "2",
    "exit_nb_visits": "3",
    "avg_time_on_page": 28,
    "bounce_rate": "0%",
    "exit_rate": "100%",
    "avg_time_generation": 0.403,
    "url": "https://www.example.com/page/bar",
    "segment": "pageUrl==https%3A%2F%2Fwww.example.com%2Fpage%2Fbar"
  },
  "..."
]
```

It looks, though, like we'll want to watch out for any items that do not have a `url` property, though it seems that it's only the catch-all that does that:

```json
[
  "...",
  {
    "label": "/page/ - Others",
    "nb_visits": 133,
    "nb_hits": 184,
    "sum_time_spent": 4490,
    "nb_hits_with_time_generation": 184,
    "min_time_generation": "0.001",
    "max_time_generation": "4.217",
    "entry_nb_visits": 51,
    "entry_nb_actions": 271,
    "entry_sum_visit_length": 14229,
    "entry_bounce_count": 5,
    "exit_nb_visits": 57,
    "avg_time_on_page": 24,
    "bounce_rate": "10%",
    "exit_rate": "43%",
    "avg_time_generation": 0.223
  }
]
```

Using `jq` at least we could filter that out doing:

```sh
curl "..." | jq 'map(select(has("url")))'
```

Not sure we actually want to omit that, though, but I'm not sure how to break it down since it doesn't really give any details besides "Others".

So, that's that, I guess.  One parameter.  And sending the correct metrics, that helps, too.  Now if only we actually changed the page title...


### Also the Admin Page Can Do That Too

Looks like you can view the `flat=1` view in Matomo's admin page, too, though the option is at the very very very bottom of the page.



## Only 100 Records?

We have `/edit/*` and `/admin/*` routes, too, and I'd kind of wondered where those went.  Turns out there was a `filter_limit` param with a default value of 100, and `/page` was first because of `filter_sort_order=desc`.  `asc` would give different results.

This is trivially fixed by adding `filter_limit=-1`.  The other option is to have the table load each page dynamically, which would probably be better, but possibly more annoying to the user?  Eh.
