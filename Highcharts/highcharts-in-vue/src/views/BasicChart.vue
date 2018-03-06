<template lang="html">
  <div class="container">
    <h1>Basic Chart</h1>
    <div class="chart-container">
      <resize-observer @notify="$refs.chart.chart.reflow()" />
      <highcharts ref="chart" :options="chartOptions" />
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      chartOptions: {
        title: { text: 'Fruit Consumption' },
        chart: {
          type: 'column',
          reflow: false,
        },
        series: [
          {
            name: 'Jane',
            data: [5, 2, 9],
          },
          {
            name: 'John',
            data: [3, 4, 1],
          },
        ],
      },
    }
  },
}
</script>

<style scoped lang="scss">
.chart-container {
  max-width: 800px;
  margin: auto;
}
</style>
