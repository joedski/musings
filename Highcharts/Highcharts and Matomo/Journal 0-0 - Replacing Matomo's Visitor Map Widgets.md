Highcharts and Matomo - Journal 0-0 - Replacing Matomo's Visitor Map Widgets
============================================================================

Since Highcharts includes Highmaps, I figured I'd also look into using that to replace the Live View and Visitors Geography widgets.  So, time to dive in.

The Live Visitors Map widget has this URL: https://metrics.exmaple.com/index.php?module=Widgetize&action=iframe&widget=1&moduleToWidgetize=UserCountryMap&actionToWidgetize=realtimeMap&idSite=1&period=day&date=yesterday&disableLink=1&widget=1

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
