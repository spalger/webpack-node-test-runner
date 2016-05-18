/* eslint-disable */

process.on('message', args => {
  global.__webpack_ids_to_test__ = args.idsToTest
  process.argv = [process.execPath, 'stdin'].concat(args.argv)
  require('mocha/bin/_mocha')
})
