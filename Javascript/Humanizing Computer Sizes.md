Humanizing Computer Sizes
=========================

```js
// NOTE: Can also be used for bits.
// Options:
// - unit: string - What unit to use instead of 'B'.
//     Default: 'B'
// - decimals: number - How many decimals to show.  Passed to `toFixed()`.
//     Default: 0
//     NOTE: Ignored if `joinParts` is specified, as it's assumed
//     you want to handle stringification yourself, there.
// - joinParts: (value: number, unitPrefix: string, unit: string) => any - How to join the value to the unit.
//     Default: (value, unitPrefix, unit) => `${value.toFixed(decimals)}${unitPrefix}${unit}`
//     You can return anything at Zombocom.  The only limits are your mind.
//     If you need an object, you can do that.
// - orderOfMagnitude: number - Hard-coded order of magnitude
//     Default: (none)
//     If you specify this, you'll override the auto-ranging behavior
//     to always use the specified order of magnitude.
//     Valid values are integers from 0 to 8 inclusive.
// - orderOfMagnitudeThreshold: number - Threshold at which to go from one order to another
//     Default: 0.9
//     Values for this option will be clamped to [0, 1].
export default function formatBytes(value, options = {}) {
  const unit = typeof options.unit === 'string' ? options.unit : 'B'
  const decimals = (!isNaN(options.decimals)) ? options.decimals : 0
  const joinParts = (
    typeof options.joinParts === 'function'
      ? options.joinParts
      : ($value, unitPrefix, $unit) => `${$value.toFixed(decimals)}${unitPrefix}${$unit}`
  )

  if (
    typeof value !== 'number'
    || isNaN(value)
    || !Number.isFinite(value)
  ) return joinParts(value, '', unit)

  const order = (
    typeof options.orderOfMagnitude === 'number'
      ? Math.round(Math.max(Math.min(options.orderOfMagnitude, 8), 0))
      // eslint-disable-next-line no-use-before-define
      : getOrderOfMagnitude(value, typeof options.threshold === 'number' ? options.threshold : undefined)
  )
  // eslint-disable-next-line no-use-before-define
  const unitPrefix = getPrefixOfOrderOfMagnitude(order)
  const valueScaled = value / (1024 ** order)

  return joinParts(valueScaled, unitPrefix, unit)
}

export function getOrderOfMagnitude(value, threshold) {
  // NOTE: log[1024](512) = 0.9
  const thresholdOrder = (
    typeof threshold === 'number'
      ? Math.min(Math.max(threshold, 0), 1)
      : 0.9
  )
  const thresholdValue = (
    typeof threshold === 'number'
      // ? Math.pow(1024, thresholdOrder)
      ? 1024 ** thresholdOrder
      : 512
  )
  const valueAbs = Math.abs(value)
  // We don't do fractional sizes.
  if (valueAbs < thresholdValue) return 0
  const orderUnrounded = (Math.log(valueAbs) / Math.log(1024))
  // We won't go above yotta
  if (orderUnrounded > 8) return 8
  // 0.9 (i.e. 512) picked by fiat
  return (
    orderUnrounded % 1 >= thresholdOrder
      ? Math.ceil(orderUnrounded)
      : Math.floor(orderUnrounded)
  )
}

export function getPrefixOfOrderOfMagnitude(orderOfMagnitude) {
  // Don't bother with fractional sizes.
  if (orderOfMagnitude <= 0) {
    return ''
  }

  // Don't bother with orders above yotta.
  if (orderOfMagnitude >= 8) {
    return 'Y'
  }

  return ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'][orderOfMagnitude]
}
```
