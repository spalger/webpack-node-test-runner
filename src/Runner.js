import webpack from 'webpack'
import { resolve } from 'path'
import defaults from 'lodash.defaults'

import { TestRun } from './TestRun'
import { TestQueue } from './TestQueue'
import { Log } from './Log'
import { findJsOutput } from './lib'

export class Runner {
  constructor(config) {
    this.config = defaults(config || {}, {
      cwd: process.cwd(),
      execArgv: [],
      watch: true,
      webpackConfigFile: 'webpack.config.js',
      log: {}, // logging config
    })

    this.onWebpackStart = this.onWebpackStart.bind(this)
    this.onWebpackDone = this.onWebpackDone.bind(this)

    this.activeRun = null
    this.runCounter = 0
    this.testQueue = new TestQueue()
    this.log = new Log(this.config.log)
  }

  init() {
    const { config, onWebpackStart, onWebpackDone } = this

    const configFilePath = resolve(config.cwd, config.webpackConfigFile)
    const configFile = require(configFilePath) // eslint-disable-line global-require
    this.compiler = webpack(configFile)

    // get notified at the begining of compilation
    this.compiler.plugin('compile', onWebpackStart)

    if (config.watch) {
      // watch and notify of each rebuild
      this.compiler.watch({}, onWebpackDone)
    } else {
      // run once and notify of completion
      this.compiler.run(onWebpackDone)
    }
  }

  onWebpackStart() {
    const { runCounter, log } = this

    if (runCounter > 0) {
      log.clearScreen()
    }

    if (this.activeRun) {
      log.warning('aborting test run')
      this.activeRun.abort()
    }

    if (runCounter > 0) {
      log.progress('webpack re-bundling')
    } else {
      log.progress('webpack bundling')
    }

    this.activeRun = new TestRun()
  }

  onWebpackDone(err, stats) {
    const { config, log, testQueue, activeRun } = this

    log.endProgress()
    log.webpackStats(stats)

    if (stats.hasErrors()) {
      log.error('skipping tests because of bundle errors')
      return
    }

    const cliArgs = [...config.execArgv, ...findJsOutput(stats)]
    const runCount = this.runCounter++

    if (runCount > 0) {
      const idsToTest = testQueue.addFromStats(stats)
      if (idsToTest.length > 0) {
        log.info('no tests to run based on the changes')
      } else {
        log.info('running %d test modules', idsToTest.length)
        activeRun.test(idsToTest, cliArgs)
      }
    } else {
      // test everything
      activeRun.test(false, cliArgs)
    }

    activeRun.on('complete', () => {
      this.activeRun = null
      testQueue.clear()
    })
  }

  abort() {
    if (this.activeRun) {
      this.activeRun.abort()
      this.activeRun = null
    }
  }
}
