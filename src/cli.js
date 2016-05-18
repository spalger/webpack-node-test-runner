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
      default: supportsColor,
      describe: 'Don\'t clear the console before a rebuild',
    },
  })
  .help()
  .argv

/* eslint-disable global-require */
const webpackConfig = require(resolve(process.cwd(), argv.config))
/* eslint-enable global-require */

let activeRun
let firstRun = false

const compiler = webpack(webpackConfig)
const pending = new PendingTests()

compiler.plugin('compile', () => {
  console.log('rebundling ...')

  if (activeRun) {
    activeRun.abort()
  }

  activeRun = new TestRunner()
})

compiler.watch({}, (err, stats) => {
  if (argv.stats || stats.hasErrors()) {
    console.log(stats.toString({
      cached: false,
      cachedAssets: false,
      colors: argv.colors,
    }))
  }

  if (stats.hasErrors()) {
    console.log('skipping tests because of bundle errors')
    return
  }

  const idsToTest = pending.addFromStats(stats)
  const bundles = findJsOutput(stats)

  if (firstRun) {
    firstRun = false
  } else {
    console.log('testing %d rebuilt modules', idsToTest.length)
  }

  activeRun.test(idsToTest, [
    ...argv._,
    ...bundles,
  ])

  activeRun.on('complete', () => {
    activeRun = null
    pending.clear()
  })
})
