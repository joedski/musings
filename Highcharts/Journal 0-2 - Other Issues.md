Other Issues I Came Across While Using Highcharts
=================================================



## installing the Annotations Module with Server Side Rendering

Today I learned you can't extend Highcharts on the server because... reasons.  I ran into this while working on a React project.

The first way I tried to solve it was with some fancy wrapper bullshittery, but that ran into issues with the React Highcharts wrapper we were using, so I backed off from that.

Instead, the solution turned out to be refreshingly simple:

```js
import ReactHighcharts from 'react-highcharts';
import Annotations from 'highcharts/modules/annotations';

if (typeof window !== 'undefined') {
  const { Highcharts } = ReactHighcharts;

  Annotations(Highcharts);

  // NOTE: See further on for this.
  // https://github.com/highcharts/highcharts/issues/7861#issuecomment-365559712
  // http://jsfiddle.net/1zm3ut2w/7/
  Highcharts.wrap(Highcharts.Annotation.prototype, 'render', function (proceed) {
    proceed.call(this);
    this.shapesGroup.clip();
  });
}

// ... etc.
```



## Annotations Being Clipped

One thing I ran into while trying to create a small sparkline chart was that Highcharts was applying a clip-path to everything, including the Annotations.  (It also applies it to the series `<path>` element which causes issues when you have a run of 0-values... but anyway.)

The way I got around that was to [just disable clipping on annotations](http://jsfiddle.net/1zm3ut2w/7/), as suggested by [one of the developers](https://github.com/highcharts/highcharts/issues/7861).  (NOTE: As of writing, 2018-04-24, this is still an open issue.)  In my react code, it looked like this:

```js
import ReactHighcharts from 'react-highcharts';
import Annotations from 'highcharts/modules/annotations';

if (typeof window !== 'undefined') {
  const { Highcharts } = ReactHighcharts;

  Annotations(Highcharts);

  // https://github.com/highcharts/highcharts/issues/7861#issuecomment-365559712
  // http://jsfiddle.net/1zm3ut2w/7/
  Highcharts.wrap(Highcharts.Annotation.prototype, 'render', function (proceed) {
    proceed.call(this);
    this.shapesGroup.clip();
  });
}

// ... etc.
```



## The Case of the Missing Series

A rather mysterious issue came up today: one of my Highmaps charts was mysteriously failing the second time it got rendered with the error `cannot read property 'setData' of undefined`, from the line `chart.series[1].setData(...)`.  Looking at `chart.options`, it seems `series` somehow got set to `null`!  Needless to say, this was rather surprising, as I explicitly set the series in my chart config to an array.  Why was it null?  Could it be Highcharts was mutating the config object?

After putting the chart config into a separate const, it seemed this was indeed the case!  How naughty.  Also irritating, as it means I need to deep-clone the config fresh every instance, which is more work.

In this case, since this happened in a React + Redux project, I just added an extra layer to the `mapStateToProps` that got passed to react-redux's `connect()` which created the per-instance config and returned that on whatever prop I had it on before.  In this particular case, the prop was `chartConfig`.

```js
export default compose(
  connect(
    () => {
      const chartConfig = {
        chart: {
          map: 'custom/world',
          // ...
        },
        // ...
      };

      return () => ({ chartConfig });
    },
    (dispatch, props) => ({
      // dispatches...
    })
  ),
  // ... more enhancers.
)(BaseMapChartComponent);
```



## softMax Doing Nothing

I ran into an issue recently where, when a data series is all 0 on the y values, `softMax` would have no effect.  It seems [as of 2018-10-01, this is still a known issue](https://github.com/highcharts/highcharts/issues/6894), with the work around being to use `softThreshold: false` on any series being used in the given chart.
