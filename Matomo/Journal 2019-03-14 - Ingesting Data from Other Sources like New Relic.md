Journal 2019-03-14 - Ingesting Data from Other Sources like New Relic
=====================================================================

In this case, specifically New Relic data, but it should be pretty applicable across different products.  I think generally it's an Export, Transform, Import type thing, just here I'm going to be looking at it from the specific standpoint of exporting from New Relic and importing into Matomo.

Sources:

1. Matomo Things:
    1. [matomo-log-analytics][ss-1-1]: Import server logs into Matomo from a variety of sources.
    2. [How to use the Log Analytics Script][ss-1-2]: Instructions about how to use [the above referenced script][ss-1-1].
    3. [Docs on the Tracking API][ss-1-3].
    4. [Custom Dimensions User Guide][ss-1-4].
2. New Relic Things:
    1. [Exporting to CSV][ss-2-1]: So basically you get a table of results.  I guess that can be used easily enough.
    2. [Query the Insights API and get back JSON][ss-2-2]: Different format, a bit heavier, but friendlier to process.
        1. [Rate Limiting on the API][ss-2-2-1]

[ss-1-1]: https://github.com/matomo-org/matomo-log-analytics
[ss-1-2]: https://matomo.org/docs/log-analytics-tool-how-to/
[ss-1-3]: https://developer.matomo.org/api-reference/tracking-api
[ss-1-4]: https://matomo.org/docs/custom-dimensions/
[ss-2-1]: https://docs.newrelic.com/docs/insights/use-insights-ui/export-data/export-insights-data-csv-file
[ss-2-2]: https://docs.newrelic.com/docs/insights/insights-api/get-data/query-insights-event-data-api
[ss-2-2-1]: https://docs.newrelic.com/docs/insights/insights-api/get-data/query-insights-event-data-api#rate-limiting



## Questions

Questions I want to answer or at least dive into.  May be appended to as research continues.

1. Is there a way to import directly from New Relic to Matomo?
    1. None that I've seen.  Just a [server log ingestion thing `matomo-log-analytics`][ss-1-1].
2. Is there an easy interchange format?
    1. Failing anything else, you can easily define a custom format handler in [`matomo-log-analytics`][ss-1-1], then create specific queries for [CSV export from New Relic][ss-2-1].  So, there is at least a lowest-common-denominator thing that can be setup.
    2. Also, according to [the docs on querying New Relic's Insights API][ss-2-2], you get back JSON, which may be friendlier to process?  Though, given we'd probably be delegating to a library of some sort anyway, the dev cost to actually parse the raw files would be minimal.
3. What's a rough idea of what all Matomo can handle, analytics wise?
    1. I mean, there's the usual like User Id (`label`), Site Id (specified at ingestion time), page build time, load time, etc.
    2. What other things?  Can we handle custom things?
        1. Yes.  Matomo has the concept of [Custom Dimensions][ss-1-4], which are first class citizens with regards to reporting, segmentation, etc.
    3. Or, perhaps a more realistic question is: What all can the [matomo-log-analytics][ss-1-1] script handle?  Can we send Custom Dimensions?
4. Technical Concern: Can we process arbitrary JSON documents with [matomo-log-analytics][ss-1-1]?
    1. As of 2019-03-14, no, [it explicitly processes things line by line](https://github.com/matomo-org/matomo-log-analytics/blob/548a941f5742fbbf448850acd646e653599e1329/import_logs.py#L2356).  We'd need an intermediate step between the response from New Relic and processing by matomo-log-analytics.

Finally, the main question:

1. By what process would we move data from New Relic to Matomo?
    1. I think we would essentially do this:
        1. Preparation:
            1. Determine what all data we want to extract from New Relic and ingest into Matomo, and how such values will map from New Relic Facets to Matomo Dimensions.
                1. If there are any Facets that must be represented as Custom Dimensions in Matomo, define those Custom Dimensions first in Matomo via the Admin Panel or else Matomo will silently ignore those dimensions.  You need the Dimension ID, anyway.
            2. Determine the Queries to use with [New Relic's Insights API][ss-2-2] based on what data we want to capture and what can be handled by Matomo.
            3. Create a parser in the [matomo-log-analytics script][ss-1-1] that handles the files returned by New Relic.
                1. We may be able to just parametrize a JSON parser, which would be easier assuming it does what we actually want it to.
            4. Sanity check that our New Relic account can make the appropriate number of requests without hitting [API rate limits][ss-2-2-1] too often.
            5. Determine how often we should load data from New Relic given all the various factors.
    2. Then, periodically, we do this:
        1. Query [New Relic's Insights API][ss-2-2], save the JSON document(s) somewhere.
            1. New Relic has a 1000 entry limit per query, so if there are more than 1000 entries returned by a given query you'll have to make additional requests.
            2. There's also [rate limiting][ss-2-2-1] to worry about, of course.
        2. Process and ingest the downloaded JSON documents using the [matomo-log-analytics script][ss-1-1].



## Initial Research

Initial research indicates there're no prefabbed solutions for importing data from New Relic directly into Matomo.  Alas.
