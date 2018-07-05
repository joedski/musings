Matomo: The API API (The Metadata API)
======================================

## I poked it

The live visits map makes this request:

```sh
curl -X POST 'https://metrics.example.com/index.php?filter_limit=2&format=json&period=range&idSite=1&segment=&date=last30&format=json&showRawMetrics=1&module=API&method=Live.getLastVisitsDetails&filter_limit=100&showColumns=latitude%2Clongitude%2Cactions%2ClastActionTimestamp%2CvisitLocalTime%2Ccity%2Ccountry%2CreferrerType%2CreferrerName%2CreferrerTypeName%2CbrowserIcon%2CoperatingSystemIcon%2CcountryFlag%2CidVisit%2CactionDetails%2CcontinentCode%2Cactions%2Csearches%2CgoalConversions%2CvisitorId%2CuserId&minTimestamp=1524754710'
```

Er, let's take off some of those params...

```sh
curl -X POST 'https://metrics.example.com/index.php?module=API&format=json&method=VisitFrequency.get&date=previous30&period=day&idSite=1&filter_sort_column=nb_visits_returning'
```

That's a lot of data.  But, I'm not using it for the data, I'm using for the next thing, the metadata request!

- Matomo's docs: `https://developer.matomo.org/api-reference/reporting-api-metadata`
- method: `API.getProcessedReport`
- target method: `VisitFrequency.get`
- Query params: `method=API.getProcessedReport&apiModule=VisitFrequency&apiAction=get`

```sh
curl -X POST 'https://metrics.example.com/index.php?module=API&format=json&method=API.getProcessedReport&apiModule=VisitFrequency&apiAction=get&date=previous30&period=day&idSite=1&filter_sort_column=nb_visits_returning'
```

```json
{
  "website": "Metrics & Analytics",
  "prettyDate": "March 27 – April 25, 2018",
  "metadata": {
    "category": "Visitors",
    "subcategory": "Engagement",
    "name": "Returning Visits",
    "module": "VisitFrequency",
    "action": "get",
    "metrics": {
      "nb_visits_returning": "Returning Visits",
      "nb_actions_returning": "Actions by Returning Visits",
      "nb_uniq_visitors_returning": "Unique returning visitors",
      "nb_users_returning": "Returning Users",
      "max_actions_returning": "Maximum actions in one returning visit"
    },
    "processedMetrics": {
      "avg_time_on_site_returning": "Avg. Duration of a Returning Visit (in sec)",
      "nb_actions_per_visit_returning": "Avg. Actions per Returning Visit",
      "bounce_rate_returning": "Bounce Rate for Returning Visits"
    },
    "imageGraphUrl": "index.php?module=API&method=ImageGraph.get&idSite=1&apiModule=VisitFrequency&apiAction=get&token_auth=anonymous&period=day&date=previous30",
    "imageGraphEvolutionUrl": "index.php?module=API&method=ImageGraph.get&idSite=1&apiModule=VisitFrequency&apiAction=get&token_auth=anonymous&period=day&date=previous30",
    "uniqueId": "VisitFrequency_get"
  },
  "columns": {
    "nb_visits_returning": "Returning Visits",
    "nb_actions_returning": "Actions by Returning Visits",
    "nb_uniq_visitors_returning": "Unique returning visitors",
    "nb_users_returning": "Returning Users",
    "max_actions_returning": "Maximum actions in one returning visit",
    "avg_time_on_site_returning": "Avg. Duration of a Returning Visit (in sec)",
    "nb_actions_per_visit_returning": "Avg. Actions per Returning Visit",
    "bounce_rate_returning": "Bounce Rate for Returning Visits"
  },
  "reportData": {
    // ...
    "Tuesday, April 24, 2018": {
      "nb_uniq_visitors_returning": 116,
      "nb_users_returning": 116,
      "nb_visits_returning": 253,
      "nb_actions_returning": 583,
      "max_actions_returning": 24,
      "bounce_rate_returning": "57%",
      "nb_actions_per_visit_returning": 2.3,
      "avg_time_on_site_returning": "00:08:09"
    },
    "Wednesday, April 25, 2018": {
      "nb_uniq_visitors_returning": 129,
      "nb_users_returning": 129,
      "nb_visits_returning": 254,
      "nb_actions_returning": 490,
      "max_actions_returning": 30,
      "bounce_rate_returning": "63%",
      "nb_actions_per_visit_returning": 1.9,
      "avg_time_on_site_returning": "00:05:36"
    }
  },
  "reportMetadata": {
    // ...
    "Tuesday, April 24, 2018": [],
    "Wednesday, April 25, 2018": []
  },
  "reportTotal": [],
  "timerMillis": "192"
}
```

How about just `API.getMetadata` or `API.getReportMetadata`?

- method: `API.getReportMetadata`
- target method: `VisitFrequency.get`
- `method=API.getProcessedReport&apiModule=VisitFrequency&apiAction=get`

```sh
curl -X POST 'https://metrics.example.com/index.php?module=API&format=json&method=API.getReportMetadata&apiModule=VisitFrequency&apiAction=get&idSite=1'
```

I think that just returns the documentation on every report.  That's ... um.  Interesting, but not targeted.

- method: `API.getMetadata`

```sh
curl -X POST 'https://metrics.example.com/index.php?module=API&format=json&method=API.getMetadata&apiModule=VisitFrequency&apiAction=get'
```

```json
[
  {
    "category": "Visitors",
    "subcategory": "Engagement",
    "name": "Returning Visits",
    "module": "VisitFrequency",
    "action": "get",
    "metrics": {
      "nb_visits_returning": "Returning Visits",
      "nb_actions_returning": "Actions by Returning Visits",
      "nb_uniq_visitors_returning": "Unique returning visitors",
      "nb_users_returning": "Returning Users",
      "max_actions_returning": "Maximum actions in one returning visit"
    },
    "processedMetrics": {
      "avg_time_on_site_returning": "Avg. Duration of a Returning Visit (in sec)",
      "nb_actions_per_visit_returning": "Avg. Actions per Returning Visit",
      "bounce_rate_returning": "Bounce Rate for Returning Visits"
    },
    "imageGraphUrl": "index.php?module=API&method=ImageGraph.get&idSite=1&apiModule=VisitFrequency&apiAction=get&token_auth=anonymous&period=day&date=2018-03-28,2018-04-26",
    "imageGraphEvolutionUrl": "index.php?module=API&method=ImageGraph.get&idSite=1&apiModule=VisitFrequency&apiAction=get&token_auth=anonymous&period=day&date=2018-03-28,2018-04-26",
    "uniqueId": "VisitFrequency_get"
  }
]
```

That's pretty neat right there.  That's basically the metadata column of the above one.  It'd be nice to have just the `columns` bit but oh well.

I tried specifying with `columns` and `showColumns` but to no avail.  The latter even hides the column docs!  Bleh!

```sh
curl -X POST 'https://metrics.example.com/index.php?module=API&format=json&method=API.getProcessedReport&apiModule=VisitFrequency&apiAction=get&idSite=1&period=day&date=today&columns=metadata,columns'
curl -X POST 'https://metrics.example.com/index.php?module=API&format=json&method=API.getProcessedReport&apiModule=VisitFrequency&apiAction=get&idSite=1&period=day&date=today&showColumns=metadata,columns'
```

I'm inclined to think that the documentation for each column is only shown if the column is normally returned, meaning this can't be used to discover what all columns are available.  Damn!

Sadly, none of these seem to return all the columns a method will generate, only those which would show up in the normal request.  Continual frustration.
