#!/usr/bin/env node

import webpack from 'webpack'
import { resolve } from 'path'
import yargs from 'yargs'
import supportsColor from 'supports-color'

import { TestRunner } from './TestRunner'
import { PendingTests } from './PendingTests'
import { findJsOutput } from './lib'

const argv = yargs
  .options({
    config: {
      default: 'webpack.config.js',
      describe: 'path to webpack config',
    },
    stats: {
      boolean: true,
      default: true,
      describe: 'Don\'t show the webpack build stats when successfull',
    },
    clear: {
      boolean: true,
      default: true,
      describe: 'Don\'t clear the console before a rebuild',
    },
    watch: {
      boolean: true,
      default: false,
      describe: 'rebuild on change, and re-test changes',
    },
  })
  .help()
  .argv

/* eslint-disable global-require */
const webpackConfig = require(resolve(process.cwd(), argv.config))
/* eslint-enable global-require */

let runner
let firstRun = true

const compiler = webpack(webpackConfig)
const pending = new PendingTests()

compiler.plugin('compile', () => {
  console.log('rebundling ...')

  if (runner) {
    runner.abort()
  }

  runner = new TestRunner()
})

const onDone = (err, stats) => {
  if (argv.stats || stats.hasErrors()) {
    console.log(stats.toString({
      cached: false,
      cachedAssets: false,
      colors: supportsColor,
    }))
  }

  if (stats.hasErrors()) {
    console.log('skipping tests because of bundle errors')
    return
  }

  const cliArgs = [...argv._, ...findJsOutput(stats)]

  if (firstRun) {
    firstRun = false
    runner.test(false, cliArgs)
  } else {
    const idsToTest = pending.addFromStats(stats)
    console.log('testing %d rebuilt modules', idsToTest.length)
    runner.test(idsToTest, cliArgs)
  }

  runner.on('complete', () => {
    runner = null
    pending.clear()
  })
}

if (argv.watch) {
  compiler.watch({}, onDone)
} else {
  compiler.run(onDone)
}
