#!/usr/bin/env node

import webpack from 'webpack'
import { resolve } from 'path'
import supportsColor from 'supports-color'

import { TestRunner } from './TestRunner'
import { PendingTests } from './PendingTests'
import { Log } from './Log'
import { findJsOutput } from './lib'
import { argv } from './argv'

/* eslint-disable global-require */
const webpackConfig = require(resolve(process.cwd(), argv.config))
/* eslint-enable global-require */

let runner
let firstRun = true

const compiler = webpack(webpackConfig)
const pending = new PendingTests()
const log = new Log()

compiler.plugin('compile', () => {
  if (!firstRun && argv.clear) {
    log.clearScreen()
  }

  if (runner) {
    log.warning('aborting build')
    runner.abort()
  }

  if (!firstRun) {
    log.progress('webpack re-bundling')
  } else {
    log.progress('webpack bundling')
  }

  runner = new TestRunner()
})

const onDone = (err, stats) => {
  log.endProgress()

  if (argv.stats || stats.hasErrors()) {
    log.write(stats.toString({
      cached: false,
      cachedAssets: false,
      colors: supportsColor,
    }))
  }

  if (stats.hasErrors()) {
    log.error('skipping tests because of bundle errors')
    return
  }

  const cliArgs = [...argv._, ...findJsOutput(stats)]

  if (firstRun) {
    firstRun = false
    runner.test(false, cliArgs)
  } else {
    const idsToTest = pending.addFromStats(stats)
    log.info('testing %d rebuilt modules', idsToTest.length)
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

process.on('exit', () => {
  if (runner) runner.abort()
})