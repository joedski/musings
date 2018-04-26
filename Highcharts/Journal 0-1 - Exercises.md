Journal 0-1 - Exercises
=======================

Some exercises implementing charts, because doing is the best way to learn.



Exercise: Replacing some Core UI Charts
---------------------------------------

### "Chromeless" Charts

It's useful to have little overview charts, so in that vein, it seemed like a good idea to be able to do something like the charts in the top cards of the [CoreUI dashboard](https://coreui.io/demo/pro/Vue_Demo/#/dashboard).

Each of these is wrapped in a `<b-col sm="6" lg="3">` so that we get 4 across at larger sizes and 2 across at smaller sizes.  (Below that, they fall back to 1 across, of course)

Each card itself looks like this:

```html
<b-card no-body class="bg-primary">
  <!-- Uses .pb-0 for 0-padding-bottom.
    It compensates for the <p>'s bottom margin. -->
  <b-card-body class="pb-0">
    <b-dropdown class="float-right" variant="transparent p-0" right>
      <template slot="button-content">
        <i class="icon-settings"></i>
      </template>
      <b-dropdown-item>Action</b-dropdown-item>
      <b-dropdown-item>Another action</b-dropdown-item>
      <b-dropdown-item>Something else here...</b-dropdown-item>
      <b-dropdown-item disabled>Disabled action</b-dropdown-item>
    </b-dropdown>
    <h4 class="mb-0">9.823</h4>
    <p>Members online</p>
  </b-card-body>
  <!-- Here's the actual chart itself, not wrapped in a <b-card-body> so it can flush up to the border -->
  <card-line1-chart-example class="chart-wrapper px-3" style="height:70px;" height="70"/>
</b-card>
```

Looking at the styling of the actual charts themselves, they've been setup to just use various transparencies of white, which is excellent.  They are color agnostic.

- For the line+dot charts, they use a stroke color of `rgba(255,255,255,.55)`.
- For the line+fill charts, they use a stroke color of `rgba(255,255,255,.55)`, and a fill color of `rgba(255,255,255,.2)`.
- For the bar charts, they use a fill color of `rgba(255,255,255,.3)`.

> Okay, actually, I see one issue: we can only control the height via `options.chart.height`.  Not a problem yet, but it is something I may want to watch out for.  Being able to pass styles and classes down to the container el would be keen.

I can see some other things I need to do on first installing them:
- Remove the background color (make it `transparent`)
- Remove the title, axes, and legend

```js
data() {
  return {
    chartOptions: {
      // ...
      chart: {
        // ...
        backgroundColor: 'transparent',
        showAxes: false,
      },
      series: [
        {
          name: 'Members online',
          // ...
        },
      ],
      // ...
      title: { text: null },
      xAxis: { visible: false },
      yAxis: { visible: false },
      legend: { enabled: false },
      credits: { enabled: false },
    },
  }
}
```

After clearing out those, it seems a lot better.  I may need to tweak the margins depending on the exact graph, but that seems like a pretty good start.  Setting `series.name` fixes showing just "Series 1" as the name.  The only problem now is that the floating annotation is super huge, and showing the series name at all is pretty redundant.  Ideally here, the floating annotation would show just the y value, not the x value, and not the name.

We might be able to fix this up by adjusting the values in `options.tooltip`.

```js
data() {
  return {
    chartOptions: {
      // ...
      tooltip: {
        headerFormat: '',
        pointFormat: '<span>{point.y}</span>',
      },
    },
  }
}
```

Indeed, that cleans things up nicely.  For the final bit of formatting, I'll take off the tooltip shadow, update the background color, and update the font color.

```js
data() {
  return {
    chartOptions: {
      // ...
      tooltip: {
        // ...
        shadow: false,
        backgroundColor: 'rgba(0,0,0,0.8)',
        style: {
          color: 'white',
        },
        borderWidth: 0,
      },
    },
  }
}
```

That gives us a pretty good look.  It's not going to work with the dotless-filled style, and it's not got the same spacing as the original dot-line style.  It's also a bit bright, so let's nip and tuck those.

```js
data() {
  return {
    chartOptions: {
      chart: {
        // ...
        spacing: [20, 20, 20, 20],
      },
      colors: ['rgba(255,255,255,.30)'],
      // ...
    },
  }
}
```

This results in a much smaller chart.  Looking at the example, it seems they're using spacing on every side but the bottom:
- The chart wrapper has `.px-3`, 3 times padding on the left and right.
- The last datapoint is offset from the bottom.

I'll just take off the top spacing.  Thankfully, they obey the CSS-shorthand for sides.

```js
data() {
  return {
    chartOptions: {
      chart: {
        // ...
        spacing: [0, 20, 20, 20],
      },
      // ...
    },
  }
}
```

That looks good, except for the highlights getting clipped... Bah.  Let's put back some, then.

```js
data() {
  return {
    chartOptions: {
      chart: {
        // ...
        spacing: [5, 20, 15, 20],
      },
      // ...
    },
  }
}
```

This looks good.


### Loading State

I know we're going to deal with remote data, so I'd like to have that handled up front.

Looking at the docs, it seems that [`options.loading`](https://api.highcharts.com/highcharts/loading) only controls styles for the loading indicator, not the contents at all.  Odd.  Looking at the [reference for `Chart#showLoading`](https://api.highcharts.com/class-reference/Highcharts.Chart#showLoading), the default loading message is set in [`optinos.lang.loading`](https://api.highcharts.com/highcharts/lang.loading).  Apparently it's supposed to be `Loading...`, but I didn't see that present.  Maybe the styling isn't correct?  I don't see an option for text color, so... guess I'll just start poking it until something happens.

First, I'll remove the background color.

```js
data() {
  return {
    chartOptions: {
      loading: {
        style: {
          backgroundColor: 'transparent',
        },
      },
      // ...
    },
  }
}
```

Oh, yep, that works.  It now shows `Loading...`, albeit not vertically centered.  Or, rather, it looks off-center because of our spacing settings, so adjusting for that should probably fix it?  The only issue I see is that we don't have a loading icon, so it's not as slick.  Ah well, I guess that can be implemented separately.

Maybe I'll just slap flexbox on it.

```js
data() {
  return {
    chartOptions: {
      loading: {
        style: {
          backgroundColor: 'transparent',
          display: 'flex',
          alignItems: 'center',
        },
        labelStyle: {
          // Reset the top position.
          top: '',
        },
      },
      // ...
    },
  }
}
```

No dice, Highcharts doesn't seem to like the `display` prop.  Well, that's bothersome.  I guess I'll just fudge it for now.  Whatever.

```js
data() {
  return {
    chartOptions: {
      loading: {
        style: {
          backgroundColor: 'transparent',
        },
        labelStyle: {
          top: '25%',
        },
      },
      // ...
    },
  }
}
```

Good enough.


### Adding the Second Line Chart Example

This one doesn't really vary the chart at all, it just changes the data set rendered.  In the original, they make the line squishy, which is cute but mostly stylistic in preference.


### Adding the Third Chart Example

This one is slightly different in that, it is a line chart, but it's got a fill.  I'm pretty sure Highcharts has an example of this.

Apparently, [this uses the `type: 'area'` chart/series](https://www.highcharts.com/demo/line-time-series).  Using this type, we [can set `options.series[].fillColor`](https://api.highcharts.com/highcharts/plotOptions.area.fillColor) to a [Color](https://www.highcharts.com/docs/chart-design-and-style/colors), (which is apparently in the general docs, not in the API docs despite being referenced there.) and this will fill in the area.

> Also, apparently, [there _is_ a `Highcharts.Color` class](http://jsfiddle.net/highcharts/zy1epj3o/)?  But it does _not_ show up in the list of Classes in the API docs.  What?

When I first set it up, I just removed the spacing values for everything but the top, to prevent clipping there, but things weren't quite flushed up to the sides, so I set the side values to `-2` and that seemed to fix that.

```js
data() {
  return {
    chartOptions: {
      chart: {
        type: 'area',
        spacing: [5, -2, 0, -2],
        // ...
      },
      series: [
        {
          // For one-offs, it's probably better to just specify `color` here directly,
          // rather than using auto-color-selection via options.colors.
          color: 'rgba(255,255,255,.35)',
          fillColor: 'rgba(255,255,255,.20)',
        },
      ],
      // ...
    },
  }
}
```


### Inching Charts Towards or Away From the Edges

There's a couple axis options I missed initially: `startOnTick` and `endOnTick`.  These default to `true`, but setting them to `false` will bound the chart drawing area along that axis to the data rather than to the next outer tick.

Combined with `min` and `max`, you can specify bounds of your graph.  So, as an example, suppose we wanted to ignore ticks on the y axis so things would always go to the top, but always have 0:

```js
data() {
  return {
    chartOptions: {
      yAxis: {
        // Let the top of the graph coincide with the top of the data.
        endOnTick: false,

        // Then always make sure the bottom is 0.
        startOnTick: false,
        min: 0,
      },
    },
  }
}
```

You can also use `minPadding` or `maxPadding` if you want to do things like have the data almost exactly fitted to the drawing area, but have a certain amount of padding between a given min/max and the end of the axis.

```js
data() {
  return {
    chartOptions: {
      yAxis: {
        // Let the top of the graph coincide with the top of the data.
        endOnTick: false,

        // Then always make sure the bottom is 0.
        startOnTick: false,
        // Pad the bottom by 5% of the pixel length of the y axis.
        minPadding: 0.05,
      },
    },
  }
}
```



Other Things
------------

### Small Sparklines with Dot Annotations and no interaction

[Matomo](https://matomo.org) has some little sparkline charts in their Visits Overview widget.  To implement this, we'll need to do a few broad things:
- Disable interaction.
- Add dot annotations.
- Eliminate all spacing, except maybe a few px to prevent annotations being clipped.
- Remove ALL the titles!
- Remove markers.

After rather a lot of finagling, I came up with this:

```js
data() {
  return {
    chartOptions: {
      chart: {
        type: 'spline',
        // Make space for the annotation dots.
        margin: [3, 3, 3, 3],
      },

      series: [
        {
          name: 'Data',
          color: SPARKLINE_COLORS.data,
          lineWidth: 1,
          marker: { enabled: false },
          data: [],
          // Note: points should be passed in as triples:
          // [xvalue, yvalue, idOrNull]
          // The id is used to identify the min, max, and latest.
          keys: ['x', 'y', 'id'],
          enableMouseTracking: false,
        },
      ],

      // HIDE ALL THE THINGS
      title: { text: null, margin: 0 },
      legend: { enabled: false },
      tooltip: { enabled: false },
      xAxis: {
        title: { enabled: false },
        labels: { enabled: false },
        visible: false,
        startOnTick: false,
        endOnTick: false,
      },
      yAxis: {
        title: { enabled: false },
        labels: { enabled: false },
        visible: false,
        // I tried to make the no-data ones show a line on the bottom.
        // Failed, but a mid-way line admittedly looks pretty nice.
        startOnTick: false,
        endOnTick: false,
        softMin: 0,
        softMax: 1,
      },
    },
  }
}
```

As noted above, the chart itself gets handed data in the form of `[xvalue, yvalue, idOrNull]`, but given the data straight from Matomo, we only have the first two elements, the xvalue and yvalue.  We have to get the id, which is `null` for most things, ourselves.

To get the min, max, and latest points for the annotations, I just manually updated the data:

```js
function getMetricsProps(props) {
  const { metrics } = props;

  let minIndex = -1;
  let maxIndex = -1;
  const latestIndex = metrics.length - 1;

  // Reverse a copy so we don't touch the original.
  // We could use reduceRight if we wanted to avoid creating an extra array,
  // but that looks noisier and I didn't feel like it.
  // Laziness.
  metrics.slice().reverse().forEach((datum, datumInverseIndex) => {
    const datumIndex = metrics.length - 1 - datumInverseIndex;

    if (minIndex === -1 || datum[1] < metrics[minIndex][1]) {
      minIndex = datumIndex;
    }

    if (maxIndex === -1 || datum[1] > metrics[maxIndex][1]) {
      maxIndex = datumIndex;
    }
  });

  return {
    // Replace the original metrics data with new ones that have additional ids tacked on.
    metrics: metrics.map((datum, datumIndex) => {
      // The latest one has precedence over the other ids.
      if (datumIndex === latestIndex) {
        return [...datum, 'latest-value'];
      }

      // Then max, because max is better.
      if (datumIndex === maxIndex) {
        return [...datum, 'max-value'];
      }

      if (datumIndex === minIndex) {
        return [...datum, 'min-value'];
      }

      // NOTE: Others must have an explicit `null` or else Highcharts gets confused.
      return [...datum, null];
    }),
    metricsHasLatest: true,
    // these are used to determine if we need add the other annotations.
    // It's kind of redundant to add them if they all overlap.
    metricsHasMin: ![-1, maxIndex, latestIndex].includes(minIndex),
    metricsHasMax: ![-1, minIndex, latestIndex].includes(maxIndex),
  };
}
```

Not the most FP-style but eh, it works.  To actually update the chart, I did the following:

```js
function updateChart(chart, props) {
  // Clear out the old annotations, if any.
  // Don't want to leave stale things about.
  chart.removeAnnotation('latest');
  chart.removeAnnotation('max');
  chart.removeAnnotation('min');

  // Add the data as usual.
  chart.series[0].setData(props.metrics);

  // Then we add the annotations, if we need to.
  if (props.metricsHasLatest) {
    chart.addAnnotation({
      id: 'latest',
      shapes: [{
        type: 'circle',
        fill: SPARKLINE_COLORS.latest,
        r: 2,
        strokeWidth: 0.6,
        stroke: 'white',
        point: 'latest-value',
      }],
    });
  }

  if (props.metricsHasMax) {
    chart.addAnnotation({
      id: 'max',
      shapes: [{
        type: 'circle',
        fill: SPARKLINE_COLORS.max,
        r: 2,
        strokeWidth: 0.6,
        stroke: 'white',
        point: 'max-value',
      }],
    });
  }

  if (props.metricsHasMin) {
    chart.addAnnotation({
      id: 'min',
      shapes: [{
        type: 'circle',
        fill: SPARKLINE_COLORS.min,
        r: 2,
        strokeWidth: 0.6,
        stroke: 'white',
        point: 'min-value',
      }],
    });
  }
}
```

This works pretty well, but as of 2018-04-24, [the bottoms of line/spline charts get clipped off](https://jsfiddle.net/Lcrkb7ov/1/).  Hopefully that gets fixed, but it's not the highest priority.

Also as of 2018-04-24, [Annotations are still clipped when at the edges of the plot area](https://github.com/highcharts/highcharts/issues/7861), but that can be fixed by [disabling clipping](http://jsfiddle.net/1zm3ut2w/7/) as demonstrated by [mentioned by TornsteinHonsi](https://github.com/highcharts/highcharts/issues/7861#issuecomment-365559712):

```js
Highcharts.wrap(Highcharts.Annotation.prototype, 'render', function (proceed) {
  proceed.call(this);
  this.shapesGroup.clip();
});
```

A small price to pay, I suppose.
