const { resolve } = require('path')
const rel = resolve.bind(null, __dirname)

module.exports = {
  context: rel('src'),
  entry: './test.entry.js',
  output: {
    filename: '[hash].js',
    path: rel('dist'),
  },
}
