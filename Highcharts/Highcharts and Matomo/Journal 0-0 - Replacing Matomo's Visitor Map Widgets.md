Highcharts and Matomo - Journal 0-0 - Replacing Matomo's Visitor Map Widgets
============================================================================

Since Highcharts includes Highmaps, I figured I'd also look into using that to replace the Live View and Visitors Geography widgets.  So, time to dive in.

The Live Visitors Map widget has this URL: `https://metrics.exmaple.com/index.php?module=Widgetize&action=iframe&widget=1&moduleToWidgetize=UserCountryMap&actionToWidgetize=realtimeMap&idSite=1&period=day&date=yesterday&disableLink=1&widget=1`

The live usage map makes this query every so often:

```
period: range
idSite: 1
segment:
date: last30
format: json
showRawMetrics: 1
module: API
method: Live.getLastVisitsDetails
filter_limit: 100
showColumns: latitude,longitude,actions,lastActionTimestamp,visitLocalTime,city,country,referrerType,referrerName,referrerTypeName,browserIcon,operatingSystemIcon,countryFlag,idVisit,actionDetails,continentCode,actions,searches,goalConversions,visitorId,userId
minTimestamp: -1
```

The columns themselves:

```
latitude
longitude
actions
lastActionTimestamp
visitLocalTime
city
country
referrerType
referrerName
referrerTypeName
browserIcon
operatingSystemIcon
countryFlag
idVisit
actionDetails
continentCode
actions
searches
goalConversions
visitorId
userId
```

It seems to do it in a pretty tight loop, too.  A few response dates in sequence:
- Wed, 25 Apr 2018 21:23:30 GMT
- Wed, 25 Apr 2018 21:23:35 GMT
- Wed, 25 Apr 2018 21:23:40 GMT
- Wed, 25 Apr 2018 21:23:45 GMT

So every 5 seconds.  Hm.

It gets back a response like this:

```json
[
  {
    "idVisit": "2199",
    "visitorId": "(visitor id!)",
    "actionDetails": [
      {
        "type": "action",
        "url": "http://localhost:3000/catalog/20/metrics",
        "pageTitle": "Page Title!",
        "pageIdAction": "160",
        "idpageview": "NZJ7bS",
        "serverTimePretty": "Apr 25, 2018 17:22:38",
        "pageId": "4263",
        "timeSpent": "2",
        "timeSpentPretty": "2s",
        "generationTimeMilliseconds": "2646",
        "generationTime": "2.65s",
        "interactionPosition": "1",
        "icon": null,
        "timestamp": 1524676958
      },
      {
        "type": "action",
        "url": "http://localhost:3000/catalog/20/metrics",
        "pageTitle": "Page Title!",
        "pageIdAction": "160",
        "idpageview": "NZJ7bS",
        "serverTimePretty": "Apr 25, 2018 17:22:40",
        "pageId": "4264",
        "generationTimeMilliseconds": "2646",
        "generationTime": "2.65s",
        "interactionPosition": "2",
        "icon": null,
        "timestamp": 1524676960
      }
    ],
    "goalConversions": 0,
    "lastActionTimestamp": 1524691360,
    "userId": "(user id!)",
    "searches": "0",
    "actions": "2",
    "referrerType": "direct",
    "referrerTypeName": "Direct Entry",
    "referrerName": "",
    "operatingSystemIcon": "plugins/Morpheus/icons/dist/os/MAC.png",
    "browserIcon": "plugins/Morpheus/icons/dist/browsers/CH.png",
    "continentCode": "amn",
    "country": "United States",
    "countryFlag": "plugins/Morpheus/icons/dist/flags/us.png",
    "city": null,
    "latitude": null,
    "longitude": null,
    "visitLocalTime": "17:22:46"
  },
  {
    "idVisit": "2198",
    "visitorId": "(visitor id!)",
    "actionDetails": [
      {
        "type": "action",
        "url": "https://example.com/my-apps?embedded=true&suppressNotifications=true",
        "pageTitle": "Page Title!",
        "pageIdAction": "17",
        "idpageview": "VfBTe2",
        "serverTimePretty": "Apr 25, 2018 17:10:29",
        "pageId": "4262",
        "generationTimeMilliseconds": "96",
        "generationTime": "0.1s",
        "interactionPosition": "1",
        "icon": null,
        "timestamp": 1524676229
      }
    ],
    "goalConversions": 0,
    "lastActionTimestamp": 1524690629,
    "userId": "(user id!)",
    "searches": "0",
    "actions": "1",
    "referrerType": "direct",
    "referrerTypeName": "Direct Entry",
    "referrerName": "",
    "operatingSystemIcon": "plugins/Morpheus/icons/dist/os/WIN.png",
    "browserIcon": "plugins/Morpheus/icons/dist/browsers/CH.png",
    "continentCode": "amn",
    "country": "United States",
    "countryFlag": "plugins/Morpheus/icons/dist/flags/us.png",
    "city": null,
    "latitude": null,
    "longitude": null,
    "visitLocalTime": "17:10:19"
  },
  {
    "idVisit": "2196",
    "visitorId": "(visitor id!)",
    "actionDetails": [
      {
        "type": "action",
        "url": "https://example.com/",
        "pageTitle": "Page Title!",
        "pageIdAction": "66",
        "idpageview": "lpiKCo",
        "serverTimePretty": "Apr 25, 2018 17:06:26",
        "pageId": "4259",
        "timeSpent": "112",
        "timeSpentPretty": "1 min 52s",
        "generationTimeMilliseconds": "2051",
        "generationTime": "2.05s",
        "interactionPosition": "1",
        "icon": null,
        "timestamp": 1524675986
      },
      {
        "type": "action",
        "url": "https://example.com/",
        "pageTitle": "Page Title!",
        "pageIdAction": "66",
        "idpageview": "Jzxs0F",
        "serverTimePretty": "Apr 25, 2018 17:08:18",
        "pageId": "4261",
        "generationTimeMilliseconds": "1292",
        "generationTime": "1.29s",
        "interactionPosition": "2",
        "icon": null,
        "timestamp": 1524676098
      }
    ],
    "goalConversions": 0,
    "lastActionTimestamp": 1524690498,
    "userId": "(user id!)",
    "searches": "0",
    "actions": "2",
    "referrerType": "direct",
    "referrerTypeName": "Direct Entry",
    "referrerName": "",
    "operatingSystemIcon": "plugins/Morpheus/icons/dist/os/WIN.png",
    "browserIcon": "plugins/Morpheus/icons/dist/browsers/CH.png",
    "continentCode": "amn",
    "country": "United States",
    "countryFlag": "plugins/Morpheus/icons/dist/flags/us.png",
    "city": null,
    "latitude": null,
    "longitude": null,
    "visitLocalTime": "17:06:25"
  }
]
```

No lat/long, but we do have ... a country.  I wonder how it determines that some events are in the north-west?

Since we do have at least a country, though not necessarily a country code, we can at least do a [bubble chart](http://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/maps/demo/map-bubble/).

The chart config is this:

```js
Highcharts.mapChart('container', {
  chart: {
    borderWidth: 1,
    map: 'custom/world'
  },

  title: {
    text: 'World population 2013 by country'
  },

  subtitle: {
    text: 'Demo of Highcharts map with bubbles'
  },

  legend: {
    enabled: false
  },

  mapNavigation: {
    enabled: true,
    buttonOptions: {
      verticalAlign: 'bottom'
    }
  },

  series: [{
    name: 'Countries',
    color: '#E0E0E0',
    enableMouseTracking: false
  }, {
    type: 'mapbubble',
    name: 'Population 2016',
    joinBy: ['iso-a3', 'code3'],
    data: data,
    minSize: 4,
    maxSize: '12%',
    tooltip: {
      pointFormat: '{point.properties.hc-a2}: {point.z} thousands'
    }
  }]
});
```

Things I notice right off:
1. The chart is instantiated using `Highcharts.mapChart` rather than `Highcharts.chart`.
2. In `config.chart`, it specifies `config.chart.map = 'custom/world'`.
3. There's a `config.mapNavigation` option.
4. The first series specifies no type, inheriting whatever.  This seems to set the color of the map itself.
5. The second series has a prop `joinBy`.
6. The second series also has a `minSize`, set to a number, and a `maxSize`, set to a percentage-string.

I'll need to read into how that `joinBy` option works.

The data itself looks like this:

```json
[
	{
		"code3": "ABW",
		"z": 105
	},
	{
		"code3": "AFG",
		"z": 35530
	},
	{
		"code3": "AGO",
		"z": 29784
	},
  "..."
]
```

Where `code3` is the 3-char country code, and `z` is the actual value.  Does Highmaps expect series values to be on `z`?  I suppose that would make sense, if `x` ond `y` already contain location data.

Regardless of why, it seems [`z` is indeed the expected property](https://api.highcharts.com/highmaps/series.mapbubble.data) and as noted there if you pass a plain number it will be taken as the `z` value for a new Point.  Also, you can't specify `x` or `y` anyway, soooo.

Next to learn about is the [`joinBy` option](https://api.highcharts.com/highmaps/series.mapbubble.joinBy).  It appears to have 3 modes of operation:
- `joinBy: string` Specifies the property of each datum-point-object used to join that datum to the [mapData](https://api.highcharts.com/highmaps/series.mapbubble.mapData).
- `joinBy: [string, string]` Given a 2-tuple of strings, specifies the same as the previous case but with the first string identifying the `mapData` prop to join by and the second identifying the `data` prop.
- `joinBy: null` Specifies that Data are joined array-position-wise to Map Data items.  Recommended for large data sets, say over a thousand data.

This in mind, the above example with `mapbubble` can be read thus: Given `mapData`, join `data` on `mapData[iso-a3] = data[code3]`.


### Matomo Data

The above in mind, I'll need to figure out what all data I can get from Matomo.  If I can get the ISO-A3 value directly, that'd be the best.  Otherwise, I'll have to just poke around and hope something happens to use something usable, like `countryFlag` or whatever.  Unfortunately, [Matomo's docs on their Live module](https://developer.matomo.org/api-reference/reporting-api#Live) do not give you a handy list of columns you can pass to `showColumns`.  (also not sure why it's `showColumns`, but it has a matching `hideColumns`, so maybe that's why?)

There's a list of [actual database columns](https://developer.matomo.org/guides/persistence-and-the-mysql-backend), but this doesn't include any of the `nb_` things, and the location values are all prefixed with `location_`, while in the query's list of columns, they are not.

There are the [usual columns for all metrics reports](https://developer.matomo.org/api-reference/reporting-api#api-response-metric-definitions), but those don't include any location based things.

I've tried the following searches without finding anything that seemed to be what I want:
- `matomo api columns`
- `matomo what columns can I query for`
- `matomo what columns can I ask the reporting api for`

So, strike out there.  [The description of their Live module](https://developer.matomo.org/api-reference/reporting-api#Live) mentions _"… but also other attributes such as: days since last visit, days since first visit, country, continent, visitor IP, provider, referrer used …"_ however this still doesn't say what actual columns I'm supposed to pass into `showColumns`.

I could just keep guessing various name permutations but that is stupid and frustrating, and I have to come up with those permutations which is see-last-description.

I'm going to try grepping through the code base, I guess.  Let's start with something that looks pretty greppable, `continentCode`.

- `plugins/UserCountry/VisitorDetails.php`
  - `$visitor['continentCode'] = $this->getContinentCode();`
  - `$continentCode = $visit->getColumn('continentCode');`
  - So something is in there.  I guess `UserCountry` is the plugin that adds that capability.
- `plugins/UserCountry/Columns/Continent.php`
  - `protected $segmentName = 'continentCode';`
  - Here Content, or `contentCode` specifically, is defined as a named Segment.
- `plugins/UserCountry/UserCountry.php`
  - `foreach ($regionDataProvider->getCountryList() as $countryCode => $continentCode)`

The rest is just test data snapshots.  Bah.

I guess `countryCode` is usable, but it's only the 2-letter code.


### Highmaps Maps: How Do We Link Data to the Map?

Looking at [this example](http://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/maps/plotoptions/series-border/), though, it seems I should be able to just reference `iso-a2` instead of `iso-a3` (and make sure to _capitalize the codes Matomo returns_) and I'm good to go.

```
joinBy: ['iso-a2', 'countryCode']
```

I'm sure Highmaps has their `mapData` documented ... somewhere.  [The option](https://api.highcharts.com/highmaps/series.mapbubble.mapData) just stipulates that it's an array of objects with at least a `path` prop defining an SVG path definition and other props to use with the `joinBy` option, the default being `code`.

I notice that in at least the global overviews, Highmaps examples reference `custom/world`, either as `chartConfig.chart.map = 'custom/world'` or `chartConfig.series[].mapData = Highcharts.maps['custom/world']`.  Looking at their general docs, [they mention](https://www.highcharts.com/docs/maps/map-collection) their [Map Collection](http://code.highcharts.com/mapdata).  Not sure if we care much about [drilldown](https://www.highcharts.com/maps/demo/map-drilldown) but it's probably something I should consider.  Notice that that drilldown example loads each detail-series' map asynchronously.

Anyway, moving on, `custom/world` seems to point to [their medium-resolution Miller projection map](http://jsfiddle.net/gh/get/library/pure/highslide-software/highcharts.com/tree/master/samples/mapdata/custom/world), which is probably more than fine enough for our uses.

Looking at the GeoJSON, I see this:

```json
{
  "title": "World, Miller projection, medium resolution",
  "copyrightUrl": "http://www.naturalearthdata.com",
  "...": "...",
  "features": [
    "...",
    {
      "type": "Feature",
      "id": "NO",
      "properties": {
        "hc-group": "admin0",
        "hc-middle-x": 0.1,
        "hc-middle-y": 0.93,
        "hc-key": "no",
        "hc-a2": "NO",
        "name": "Norway",
        "labelrank": "3",
        "country-abbrev": "Nor.",
        "subregion": "Northern Europe",
        "region-wb": "Europe & Central Asia",
        "iso-a3": "NOR",
        "iso-a2": "NO",
        "woe-id": "-90",
        "continent": "Europe"
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [
          { "...": "..." }
        ]
      }
    },
    "..."
  ]
}
```

Seems the `properties` has what things we can use with `joinBy`.  Excellent.


### Considerations: Only Country Code is Available... For Now

In the project I was originally doing this for, we have a couple more issues: For one thing, most of our traffic is going through corporate proxies, which mainly exit in one location in the US, so most of our traffic reads as coming from the US.  `countryCode` is populated, but (probably?) has to be asked for from Matomo by name.

Worse however is that there's no `city` nor `latitude` + `longitude`, though the latter might be a bit much to ask for.  For our project, we only wanted `city` accuracy, but as of now even if we did have that it would be only like 3 cities in the world.  We might as well just use a plain visitor counter.

If we do get `city` later, it's likely we'll need to translate that to Latitude + Longitude, but that at least is just a lookup.  It's more annoying that we don't even have a city at all, even if it'd currently be inaccurate.

Since we were trying to get things out sooner than later, it meant just rolling with what we've got, so country-accuracy it is.



## Graphical Representation

Matomo's Live Visitor Map widget uses pulsing bubbles of various sizes/brightnesses to represent visitor volume and recentness, although I'm not sure which is which.  If I had to guess, I'd say brightness is used to represent recentness, and size is used to represent visitor volume.  I'll need to poke around their widget to see if that's indeed what they do.

Taking a look at it today, I see two bubbles with actual city locations... where are these coming from?  Aah, they are coming from the initial map load.  Hm!  And those more recent datapoints indeed have `city` and `latitude` and `longitude`!  Okay, so there's some extra consideration then.

The question then is whether or not Highmaps can use lat/long data, and if so, how to normalize all points to have lat/long.  The answer seems to be yes, though we'll see just how that's implemented:

- [Basic Lat/Long Example](https://www.highcharts.com/maps/demo/mappoint-latlon)
- [More Advanced Lat/Long Example (using bubbles!)](https://www.highcharts.com/maps/demo/latlon-advanced)
  - It also has a dotted crosshair.  Hee.
- [General docs on Lat/Long in Maps](https://www.highcharts.com/docs/maps/latlon)

From the docs, it looks then like we can give a datum a `lat` and a `lon` property with the appropriate values and, so long as the map itself has `hc-transform` defined.  As it would turn out, Highcharts' collection of Maps all have this.  Heh.

This also means we don't need the `joinBy`... except that we don't have the center lat/lon for those data points which lack a `city`.  We need to somehow map those to country centers, or rather map their countries' centers to lat/lon.

Looking at their [`world.json`](http://code.highcharts.com/mapdata/custom/world.js), the various Countries (well, Features, but the Features here happen to be Countries) do each have an `hc-middle-x` and `hc-middle-y`, but it looks like these are relative coordinates that go from 0 to 1, although I'm not sure where the origin is with them.  Still, I suppose the immediate question is if Highmaps includes some utility functions to give me some lat/lon coordinates for these.

Looking at their [advanced lat/lon example](https://www.highcharts.com/maps/demo/latlon-advanced), their crosshairs include the lat/lon next to them using a custom method:

```js
$('#container').mousemove(function (e) {
    var position;
    if (chart) {
        if (!chart.lab) {
            chart.lab = chart.renderer.text('', 0, 0)
                .attr({
                    zIndex: 5
                })
                .css({
                    color: '#505050'
                })
                .add();
        }

        e = chart.pointer.normalize(e);
        position = chart.fromPointToLatLon({
            x: chart.xAxis[0].toValue(e.chartX),
            y: chart.yAxis[0].toValue(e.chartY)
        });

        chart.lab.attr({
            x: e.chartX + 5,
            y: e.chartY - 22,
            text: 'Lat: ' + position.lat.toFixed(2) + '<br>Lon: ' + position.lon.toFixed(2)
        });
    }
});
```

The key here seems to be the calculation of `position`, but that takes absolute chart coordinates, not relative chart coordinates.  I may need to dig into the various utility functions Highcharts/Highmaps provides to actually suss this one out.

Looking at `chart` and `axis` are probably good places to start.  `series` too, probably.

Hm.  Not really seeing much.  `series.data` might be a way to go?  But that doesn't really show `mapData`, I don't think.  Looking at `series.data` in [this Map Borders example](http://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/maps/plotoptions/series-border/), though, I can see `plotX` and `plotY`.  Also `iso-a2` and `code`, but not `iso-a3`.  That might be due to `joinBy` though.  Ah, but `properties` is still there, which looks like it came from the Map JSON, so finding by `properties.iso-a2` might be the most dependable option.

Or rather:

```js
const code2ToCoords = series[0].data.reduce((acc, datum) => {
  acc[datum.properties['iso-a2']] = { plotX: datum.plotX, plotY: datum.plotY };
  return acc;
}, {})
```

Or even better:

```js
const code2ToLatLon = series[0].data.reduce((acc, datum) => {
  acc[datum.properties['iso-a2']] = chart.fromPointToLatLon({
    x: chart.xAxis[0].toValue(datum.plotX),
    y: chart.yAxis[0].toValue(datum.plotY),
  });
  return acc;
}, {});
```

Theoretically, that should only need to be done once on initial render, then we can convert 2-letter country codes as defaults.  Two problems:
- This has to be done every time we show a chart.
- This can't be done until after the first render.

This introduces a 1-frame delay to showing the data itself.  Far better would be to have that data already calculated, since it's not likely countries are to change their lat/long appreciably in any reasonable timescale.  Since it's lat/lon, it's also not beholden to any one particular rendering or projection.


### Country Data

[A bit of Googling](https://www.google.com/search?safe=active&q=country+land+mass+center+latitude+longitude+csv&oq=country+land+mass+center+latitude+longitude+csv) brought me to [this handly repository of country data](https://mledoze.github.io/countries/).  It's licensed under the [Open Data Commons Open DB License (ODbL)](https://opendatacommons.org/licenses/odbl/summary/), so should be fine to use, though technically we should include a statement for that.

I have `jq` installed, so I should be able to do just this:

```sh
jq '[.[] | {cca2, cca3, location: { lat: .latlng[0], lon: .latlng[1] }}]' countries.json
```

And that'll filter it down to just the data I want.  Score.  Then, any datum that doesn't have latitude and longitude already included, I just use the appropriate country's location.  I used `lon` instead of `lng` because Highmaps uses the former.


### Another Highcharts Wrapper

Apparently there's an [official-for-sure React-wrapper for Highcharts](https://www.npmjs.com/package/highcharts-react-official), so.  There's that?  It doesn't include Highcharts with itself, which is perhaps reason enough to use it over the current one.  I don't think changing over should require too much work.  Probably.  Maybe I'll try that now?

One thing to note: The official wrapper has not much update logic.  It updates if `props.update` is truthy, or if it's `undefined`, so by default.  It uses `chartInst.update(this.props.options)` to actually update the chart itself, so it defers to Highchart's own update functionality to deal with actual changes.  Naturally, you should try to prevent too many updates regardless of where they come up.  Since the metrics charts don't change the config and always update data manually, I can just pass `false` here.


### Actually Querying Matomo

So in the opnening, I didn't show the full request made my Matomo's Live Visitors Map widget, nor did I show the request it opens with, which is obviously a bit bigger than the one it makes every 5 seconds.

Here's the initial request made:

```
https://metrics.example.com/index.php?period=range&idSite=1&segment=&date=last30&format=json&showRawMetrics=1&module=API&method=Live.getLastVisitsDetails&filter_limit=100&showColumns=latitude%2Clongitude%2Cactions%2ClastActionTimestamp%2CvisitLocalTime%2Ccity%2Ccountry%2CreferrerType%2CreferrerName%2CreferrerTypeName%2CbrowserIcon%2CoperatingSystemIcon%2CcountryFlag%2CidVisit%2CactionDetails%2CcontinentCode%2Cactions%2Csearches%2CgoalConversions%2CvisitorId%2CuserId&minTimestamp=-1

query:
  period: range
  idSite: 1
  segment:
  date: last30
  format: json
  showRawMetrics: 1
  module: API
  method: Live.getLastVisitsDetails
  filter_limit: 100
  showColumns: latitude,longitude,actions,lastActionTimestamp,visitLocalTime,city,country,referrerType,referrerName,referrerTypeName,browserIcon,operatingSystemIcon,countryFlag,idVisit,actionDetails,continentCode,actions,searches,goalConversions,visitorId,userId
  minTimestamp: -1
```

Here's the recurring request:

```
https://metrics.example.com/index.php?period=range&idSite=1&segment=&date=last30&format=json&showRawMetrics=1&module=API&method=Live.getLastVisitsDetails&filter_limit=100&showColumns=latitude%2Clongitude%2Cactions%2ClastActionTimestamp%2CvisitLocalTime%2Ccity%2Ccountry%2CreferrerType%2CreferrerName%2CreferrerTypeName%2CbrowserIcon%2CoperatingSystemIcon%2CcountryFlag%2CidVisit%2CactionDetails%2CcontinentCode%2Cactions%2Csearches%2CgoalConversions%2CvisitorId%2CuserId&minTimestamp=1525101937

query:
  period: range
  idSite: 1
  segment:
  date: last30
  format: json
  showRawMetrics: 1
  module: API
  method: Live.getLastVisitsDetails
  filter_limit: 100
  showColumns: latitude,longitude,actions,lastActionTimestamp,visitLocalTime,city,country,referrerType,referrerName,referrerTypeName,browserIcon,operatingSystemIcon,countryFlag,idVisit,actionDetails,continentCode,actions,searches,goalConversions,visitorId,userId
  minTimestamp: 1525101937
```

It looks like the primary difference is the `minTimestamp` param, which I suppose changes to the current tiem on any request after the first.

After a bit of poking, I found that `Math.floor(Date.now() / 1000)` gives the same value as `minTimestamp` (taking into account a few seconds delay).  It seems you pass in the local time, and I suppose then that Matomo uses the request time to determine the timezone offset so it can relate that to the timestamp it stores internally.  Or maybe it doesn't do that at all, but that wouldn't really make sense for live visitor things.

I think for now, I'll remove the `actionDetails` and add `countryCode`.

```
latitude
longitude
lastActionTimestamp
visitLocalTime
city
country
countryCode (NOTE: Adding this.)
referrerType
referrerName
referrerTypeName
browserIcon
operatingSystemIcon
countryFlag
idVisit
// actionDetails
continentCode
actions
searches
goalConversions
visitorId
userId
```


### Graphical Representation, Continued: Actually Formatting the Data

I think Matomo's bubbles are purely about recentness, and they render both color and size based on that dimension, rather than something more complex like size being volume and color being recentness.  Granted, that would make things a bit odd in the case of when a location has 1 new hit but still has a bunch of older ones recent enough to have a bubble... I think that would involve some amount of binning-by-time-span.

Fair bins might be something like:
- 0 to >3min
- 3min to >10min
- 10min to >30min
- 30min to >1hr
- 1hr to >4hr
- Drop anything 4hr or older

Then, just give the bins ordering from oldest to newest, last layer on top, and that'd be good enough I think.

Anyway, I guess I'll just do the same here: Bubble size maps to recentness rather than volume, although this is misleading, I think.

Using the country JSON, we can guarantee every point has coordinates.

How do we want to actually aggregate, now?  I think I might end up using the above bins, actually.
- Time Bin, as described above
- How long ago the most recent action was
- Count of different users
  - NOTE: I thought about listing out the users here, but that might be a bit much...
- Count of total actions
- Browsers used by all users (by icon)
- OSes used by all users (by icon)

As a note, it is possible to [control the color of a given datum either per datum with `datum.color` or by setting up zones for `column` charts with `chartOptions.column.zones[].color`](https://stackoverflow.com/questions/34800720/highcharts-dynamically-change-bar-color-based-on-value).  Not sure if `zones` works with other types, let alone maps, but failing that we can just control the colors directly.

> NOTE: Actually, Matomo's widget just draws one bubble per user, and the bubble's size, color, and opacity are all linked to just one dimension, how recent that user's last action was.
>
> This is supported by how it draws many many bubbles over the same spot, specifically one city, which my boss said is where one of our corporate proxies exits.  This also explains why it shows a specific user when hovering the bubble.  I suspect Matomo expected to get accurate location data, or at least accurate enough.  This assumes most people won't be in the same place, though, so is kind of annoying.

Given the above note, I think just to maintain the current behavior, sans the obnoxious overlay, I'll just do what Matomo did:
- Cull older than 4 hours
- Group by User
- Show:
  - City and/or Country
  - How long ago most recent action was
  - Country (flag icon)
  - Browser (icon)
  - OS (icon)

Process then will go something like this:
- Append received data to cache
- Apply pipeline:
  - For each `datum.userId`, take latest datum according to `datum.lastActionTimestamp`
  - Cull data whose `lastActionTimestamp` is older than 4 hours ago
  - Order by `lastActionTimestamp` ascending


### Lat/Lon in Highmaps

Seems the map `custom/world` [doesn't support lat/lon points out of the box](https://www.highcharts.com/errors/22).  That's interesting.  Time to load yet another library, then, specifically `proj4.js` in this case.

I have no idea how Highcharts is accessing `proj4`, and I don't see it documented anywhere, so I assume it's pulling off of `window` or `global`.  This means I'll need add an import wrapper to make sure `proj4` is on `window` before `Highcharts` is even imported itself.  To ensure this, I'll add it to the project's own `Highcharts` import wrapper.  Wooo dependency graph.

Okay, that didn't work.  Now what?  Maybe their [docs on custom GeoJSON maps](https://www.highcharts.com/docs/maps/custom-geojson-maps) will have something?  Nope.  Back to stabbing in the dark I suppose.  I'm definitely [not the only one facing this issue](https://stackoverflow.com/questions/49009504/how-to-import-proj4js-to-use-with-highmaps).  Time to look through Highcharts' code, I guess.

- https://github.com/highcharts/highcharts/blob/87a23ca7db66c754e8502722c25fa6c345be7b14/js/parts-map/GeoJSON.js#L73
  - Checks `win.proj4`, but it logs `error(21)`, not 22.
- https://github.com/highcharts/highcharts/blob/87a23ca7db66c754e8502722c25fa6c345be7b14/js/parts-map/GeoJSON.js#L183
  - Checks `this.mapTransforms` and if that's not truthy then it logs `error(22)`.
  - Where's `this.mapTransforms` set?  [Their docs](https://api.highcharts.com/highmaps/chart.mapTransforms) would seem to indicate it's set in the options, or else extracted from the map data.

What about that last point?  If it's supposed to pull the transform data from the map and Highmap's [GeoJSON of their medium resolution Miller projected world map](http://code.highcharts.com/mapdata/custom/world.geo.json) has such data, why's it still complaining?  Do I need to load it manually?  Looking again at their [general docs on their Map Collection](https://www.highcharts.com/docs/maps/map-collection), that is indeed the case.  Oops.  Well, does their NPM package include those?  Doesn't look like it.  I guess I'll need to download all the maps myself, either that or use their hosted files.

It's really a good thing, of course, since including all the maps right off would both bloat the bundle and possibly cause licensing issues, but still annoying for getting off the ground.

Well, Highcharts stopped spamming error 22, but now it's stuck on `loading`.  Oh, wait, that's my bad.  I have things set up to have that manual, so the updater function can show a message instead if it wants.

Right, so it's rendering points, in two locations as expected since there's only two places right now... But where's the map?  Do I still need to set some lines or colors?  I already have `borderWidth: 1`, which is the only thing I can find right now.  Some maps don't even have that.

Maybe I'll try just adding a series with nothing in it?  That doesn't show anything either.

I'm going to try resetting to no chart config and see if that helps.  The base chart config is useful for all the non-map charts, but I actually have no idea if it's affecting something with the maps or not.

Ah, indeed, something in there is the issue.  Next, we take out the saparate countries layer... and the map is gone.  Bah.  Putting that back, then.  And now the bubbles are gone.  Okay.

Oh, interesting, looks like Highcharts mutates the array of data you pass to `chart.series[].setData()`.  Adding a `.slice()` call to that.

This still doesn't explain why the bubbles don't show up here.  I'm kind of at wit's end today, I'll come back tomorrow.  I'm tempted to just put `joinBy: ['iso-a2', 'datum.countryCode']` and leave it at that, but we're going to the trouble of getting actual cities and lat/lon, so... Bleh.
