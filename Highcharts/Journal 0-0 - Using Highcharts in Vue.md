Journal 0-0 - Using Highcharts in Vue
=====================================

In no less than two separate Vue projects, we're using Highcharts as the charting library over things like Chart.js or dygraphs, so here's coalesced notes on that learning process.



Research into Other Modules
---------------------------

Before diving in, I wanted to do a quick search into if anyone else had stuck Highcharts into Vue components.  Two results turned up at the top:

1. [vue-highcharts](https://github.com/weizhenye/vue-highcharts)
2. [vue2-highcharts](https://github.com/superman66/vue-highcharts)


### Analysis

Looking at the two, I like 1 better.  If I were to use one off the shelf, that'd be it.  I think the reasons are mostly down to how 2 handles certain things:
- It doesn't create separate components for the other constructors, that is no `<highstock>` or `<highmaps>` out of the box. (NOTE: You still need to actually install those modules prior to use!)
- It doesn't let you customize the build of Highcharts you use.

That said, it's not a very big integration.  I can just copy the parts I like, add what I need, remove what I don't.


### Second Look

After letting that stew for the night, I decided to take a second look through the code base of `vue-highcharts`.  There are some nice considerations already built in:
- Not relevant to us, but it does include provisions for use with both Vue 1.x and Vue 2.x.
- It has a separate component for just the Renderer: `<highcharts-renderer>`.
- It has built-in considerations for SSR.

There's something I'm not sure about, though:
- When you update the `options` prop, it just calls `this.renderChart`, which does `this.chart = new ChartConstructor(...)`.
  - I'll need to check if Highcharts has any special handling of this, or if that just goes through setup and teardown.
  - I will say it does _not_ call `this.chart.destroy()` before doing this, and I seem to recall that the Highcharts documentation said you do indeed not need to do that if just replacing the old one.
    - Hm.  This is not mentioned in their [docs about the constructor](https://api.highcharts.com/class-reference/Highcharts.Chart#Chart), nor on their [page about live data](https://www.highcharts.com/docs/working-with-data/live-data).
    - This behavior is explicitly mentioned in their [documentation on the Chart#destroy() method](https://api.highcharts.com/class-reference/Highcharts.Chart#destroy):
      - "This method\[, `destroy()`,] is called internally before adding a second chart into the same container, ..."
    - So, it means we don't need to worry about disposal, but it also means that if we update the options, it creates a new chart.  This means live data requires different handling, specifically doing `this.$refs.theChartComponent.chart.series[si]...` and so on.

#### Summary

For the most part, [vue-highcharts](https://github.com/weizhenye/vue-highcharts) seems like a good wrapper implementation, with 1 major caveat: It has no special handling of updates to data.  Granted, this is mostly an issue for showing live data, but it is never the less something to consider.  It is also easy to work around: Don't include the data in the initial `options`, and just access the chart instance afterwards.

Basically, you'd just do this:

```js
export default {
  // ...

  watch: {
    series(nextSeries) {
      nextSeries.forEach((series, index) => {
        this.$refs.chart.chart.series[index].setData(series.data)
      })
    }
  }
}
```

All in all, it seems like a good, usable wrapper that does all the basic stuff and doesn't get in the way when you need to dip down into things.  If we need to create our own wrapper to add our specific needs for dynamic updates, we can do that.



Putting it in Manually
----------------------

Just to start working with the library itself, I'm going to use it straight inside a component without regard to reusability.

First, I'll need to [install the library](https://www.highcharts.com/docs/getting-started/install-from-npm) and import it.

> NOTE: Although not gotten into here, one measure of later optimization that could take place is to create a [custom build](https://www.highcharts.com/docs/getting-started/how-to-create-custom-highcharts-files), thus reducing the deliverable.

The annotation animation looks like it's only going at 30fps which isn't buttery smooth.  This is something that kinda dings it compared to, well, everything else.  Most people probably won't notice, at least not enough to complain.  That said, the amount of charting prowess we get out of the box is more valuable.  I'll still want to look into if the animation can be smoothed out, they may be constrained by their wide support matrix. (Using VML rendering to target _IE6_!)


### First Blush

- The Good:
  - Interactive out of the box:
    - Floating annotation that shows the highlighted value
    - Clickable legend to narrow results to a subset
  - When changing the filtering of the data already in the chart, it animates rather than just rerendering with the new bounds
- The Bad:
  - Floating annotation doesn't animate smoothly, looks kinda <=30fps.
  - Chart doesn't resize until a bit after sizes stop changing, so it doesn't look quite like a native interface element.
    - Admittedly, that's probably something only I care about.  Most people shouldn't run into that.

#### The Axes

I'll admit, looking at the input as is, I would have thought that I would get a series of upwards bars rather than the sideways bars that actually appear.  The `xAxis` has `categories` of the 3 fruits under consideration, while the `yAxis` has the title text `Fruit Eaten`.  It thus surprises me that that title text appears under the horizontal axis, while the categories appear up the vertical axis!

This seems inverted relative to the resultant image, as `Fruit Eaten` appears to identify the quantity of fruit eaten rather than the kind.  Even reading [their description of how axes are configured](https://www.highcharts.com/docs/chart-concepts/axes), I don't really see how this works out.

I tried setting the `chart.type` to `column` instead of `bar`, and this swapped the axes!  It seems that that is what the difference between them is: Bar swaps the the `xAxis` and `yAxis` while `column` treats them as expected, otherwise they are the same chart.  How odd.


### Setting Global Options

There's also [a way to set global/default options](https://www.highcharts.com/docs/getting-started/how-to-set-options#2) which can be used to set up the chart theme for your site.  Handy.


### Other General Things

#### Range Scoping/Selection

It looks like [Highstock has built in range-selection](https://www.highcharts.com/docs/chart-concepts/range-selector), so if you load in the relevant data it can automatically scope it to the given time ranges.


### Toying With Features

#### Plot Bands

You can add colored bands to the chart using the `{x,y}Axis.plotBands` array.  Not entirely relevant at this very moment, but it could be later on.

```
yAxis: {
  title: {
    text: 'Fruit Eaten',
  },
  plotBands: [
    {
      color: '#95e6c1',
      from: 4.5,
      to: 7.5,
      label: {
        text: 'Fructal Consumption Criticality',
        verticalAlign: 'top',
        y: 15,
      },
    },
  ],
},
```

#### Adding Data Live

In their [example about live data](https://www.highcharts.com/docs/working-with-data/live-data), point 3 shows how to push new data on to an exsting series using [`Series#addPoint`](https://api.highcharts.com/class-reference/Highcharts.Series#addPoint).

```js
var series = chart.series[0];
// shift if the series is longer than 20
var shouldShift = series.data.length > 20;
// If you're pushing a whole lotta data, set this to false
// then call `chart.redraw()` after you've added everything.
var shouldRedraw = true;

// add the point
chart.series[0].addPoint(point, shouldRedraw, shouldShift);
```

In the case of discrete data like with the fruits eaten example, we'll want to use `Series#setData()` instead:

```js
// chart.series[0];
var nextSeries = [
  {
    name: 'Jane',
    data: [5, 2, 9],
  },
  {
    name: 'John',
    data: [3, 4, 1],
  },
];

nextSeries.forEach((series, index) => {
  chart.series[index].setData(series.data);
});
```

Since we're keeping the same number of data, it should smoothly animate the charts.  This is indeed the case on compilation.



Other Things
------------


### General Config Notes

- `options.colors: Array<ColorString>` defines the list of colors to pull from for each Series, starting at the beginning and cycling after the end.
- `options.credits: Object` Defines various settings for the credits link.
  - `options.credits.enabled: boolean` can be used to turn it off completely.
- `options.data: Object` can be used instead of `options.series` to specify raw data, but requires the optional `modules/data.js` module to be loaded.
  - You can still specify a number of series from your imported data by using `options.data.seriesMapping: Array<Object>`, which maps data point attributes to data columns.
    - e.g. `[{ label: 2 }, { x: 3, y: 4, label: 5 }]` creates two series: one with `x` pulled from column `0`, `y` pulled from column `1`, and `label` pulled from column `2`; And another with `x`, `y`, and `label` respectively from columns `3`, `4`, and `5`.
