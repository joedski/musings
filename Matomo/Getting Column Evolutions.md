Getting Column Evolutions
=========================

> NOTE: I use [`jq`](https://stedolan.github.io/jq/) to format the returned JSON here.  Also to convert query params in JSON form to URL-query-string form.

One thing that might be nice to have is the evolutions (relative changes in values over the given period of time) of columns rather than just the end values, preferably without sending too many extra requests over the wire.  Obviously, one could just diff between a given period and that same period-length offset to before the given period, but that's annoying.

Searching their [docs on the Reporting API](https://developer.matomo.org/api-reference/reporting-api) turns up 5 instances of the word `evolution`:
- `API.getRowEvolution`
- Some blurb about visualizations in the `CustomReports` module
- `FormAnalytics` module concerning form performance
- As an option for the `graphType` param of `ImageGraph.get`
- In the `show_evolution_values` param of `TreemapVisualization.getTreemapData`

Only one of these looks promising, so I'll start there.

`API.getRowEvolution` has the following parameters:
- Standard params:
  - `idSite`
  - `period`
  - `date`
- Specific params:
  - I'd suppose these two control what underlying module/method is called:
    - `apiModule`
    - `apiAction`
  - `label = ''` Filter by label?  Label the results?
  - `segment = ''` [Segment stuff](https://developer.matomo.org/api-reference/reporting-api-segmentation) I'd suppose.
  - `column = ''` What column to get the evolution for.  Omit for some default?
  - `language = ''` Language for the descriptions, I guess?
  - `idGoal = ''` ID for a specific Goal?
  - `legendAppendMetric = '1'`
  - `labelUseAbsoluteUrl = '1'`
  - `idDimension = ''`

To determine (guess) at what some of these meant, I had to look at [one of their examples](https://demo.matomo.org/?module=API&method=API.getRowEvolution&idSite=7&period=range&date=previous7&apiModule=UserCountry&apiAction=getCountry&legendAppendMetric=1&labelUseAbsoluteUrl=1&format=xml&token_auth=anonymous).  (Curiously, their existing example seems to be unsupported: it tries to use `period=day&date=today`; I changed it to `period=range&date=previous7`)  Here's its params:
- `module=API`
- `method=API.getRowEvolution`
- `idSite=7`
- `period=range`
- `date=previous7`
- `apiModule=UserCountry`
- `apiAction=getCountry`
- `legendAppendMetric=1`
- `labelUseAbsoluteUrl=1`
- `format=xml`
- `token_auth=anonymous`

```sh
MATOMO_TOKEN=M4t0mo70k3n
MATOMO_URL=https://metrics.example.com
MATOMO_SITE_ID=1
alias jsonToQuery='jq -r '"'"'[ to_entries | .[] | "\(.key | @uri)=\(.value | @uri)" ] | join("&")'"'"''
curl "$MATOMO_URL?$(jsonToQuery <<QPARAMS
{
  "format": "json",
  "token_auth": "$MATOMO_TOKEN",
  "idSite": $MATOMO_SITE_ID,
  "module": "API",
  "method": "API.getRowEvolution",
  "period": "range",
  "date": "previous3",
  "apiModule": "UserId",
  "apiAction": "getUsers"
}
QPARAMS
)" | jq
```

Er, that tries to aggregate on the label, which is a string...  I guess `column` just picks the first one, which ever column is "first", and tries to operate on that.  Let's use `nb_actions` instead, that's more useful.

```sh
MATOMO_TOKEN=M4t0mo70k3n
MATOMO_URL=https://metrics.example.com
MATOMO_SITE_ID=1
alias jsonToQuery='jq -r '"'"'[ to_entries | .[] | "\(.key | @uri)=\(.value | @uri)" ] | join("&")'"'"''
curl "$MATOMO_URL?$(jsonToQuery <<QPARAMS
{
  "format": "json",
  "token_auth": "$MATOMO_TOKEN",
  "idSite": $MATOMO_SITE_ID,
  "module": "API",
  "method": "API.getRowEvolution",
  "period": "range",
  "date": "previous3",
  "apiModule": "UserId",
  "apiAction": "getUsers",
  "column": "nb_actions"
}
QPARAMS
)" | jq
```

That looks better.  Using these params, we get responses in the following form:

```json
{
  "column": "nb_actions",
  "reportData": {
    "2018-05-26": [
      {
        "nb_actions_0": 2,
        "nb_actions_1": 3,
        "nb_actions_2": 1,
        "...": "..."
      }
    ],
    "2018-05-27": ["..."],
    "2018-05-28": ["..."]
  },
  "metadata": {
    "metrics": {
      "nb_actions_0": {
        "name": "IdOfSomeUser (Actions)",
        "min": 0,
        "max": 2,
        "change": "-100%",
      },
      "nb_actions_0": {
        "name": "UserWithNoChange (Actions)",
        "min": 0,
        "max": 2,
        "change": "0%",
      },
      "nb_actions_0": {
        "name": "UserWithUndefinedChange? (Actions)",
        "min": 4,
        "max": 0,
      },
      "...": "..."
    },
    "dimension": "UserId",
    "columns": {
      "label": "Label",
      "nb_visits": "Visits",
      "nb_actions": "Actions",
      "nb_visits_converted": "Visits with Conversions",
      "nb_actions_per_visit": "Actions per Visit",
      "avg_time_on_site": "Avg. Time on Website",
      "bounce_rate": "Bounce Rate",
      "conversion_rate": "Conversion Rate"
    }
  }
}
```

Curious, but workable.

Some of the items at `$.metadata.metrics` don't have a percent change, though.  While I'm not entirely certain, I think this is due to them starting at `0` at the beginning of the given period and having a value, positive or negative, from there, which represents a percent change of infinite magnitude even though it may have gone from `0` to `2`.  Of course, the opposite is not true: Going from `2` to `0` is a `-100%` difference.  Ah, the folly of using percent-changes: They depend on the initial value and `0` causes issues.

I wonder why `$.reportData[date]` has an array?  Does it do that if I use a report that doesn't segment data such as `VisitsSummary.get`?

```sh
MATOMO_TOKEN=M4t0mo70k3n
MATOMO_URL=https://metrics.example.com
MATOMO_SITE_ID=1
alias jsonToQuery='jq -r '"'"'[ to_entries | .[] | "\(.key | @uri)=\(.value | @uri)" ] | join("&")'"'"''
curl "$MATOMO_URL?$(jsonToQuery <<QPARAMS
{
  "format": "json",
  "token_auth": "$MATOMO_TOKEN",
  "idSite": $MATOMO_SITE_ID,
  "module": "API",
  "method": "API.getRowEvolution",
  "period": "range",
  "date": "previous3",
  "apiModule": "VisitsSummary",
  "apiAction": "get",
  "column": "nb_actions"
}
QPARAMS
)" | jq
```

```json
{
  "result": "error",
  "message": "Reports like VisitsSummary.get which do not have a dimension are not supported by row evolution"
}
```

Oh, okay, then.  That feature is not as useful as I'd hoped.  It looks though like it just does a `period=day&date=START,END` type thing and compares the first and last values in that period.  I may just want to do that, then: request the first and last days of the range and diff those numbers, or just return those first/last values and let display handle it.  It's basically another form of aggregation: Get first, last, min, max of whatever over suchandsuch range.
