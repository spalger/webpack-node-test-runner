const repeatString = require('./repeatString.js')

module.exports = function leftPad(str, n) {
  return repeatString(' ', n - str.length) + str
}
