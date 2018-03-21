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
