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
