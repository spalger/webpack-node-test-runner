import webpack from 'webpack'
import { resolve } from 'path'
import defaults from 'lodash.defaults'
import once from 'lodash.once'
import shellEscape from 'shell-escape'

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
      manual: false,
      webpackConfigFile: 'webpack.config.js',
      log: {}, // logging config
    })

    const configFilePath = require.resolve(resolve(config.cwd, config.webpackConfigFile))
    this.configFile = require(configFilePath) // eslint-disable-line global-require
    delete require.cache[configFilePath]

    this.onWebpackStart = this.onWebpackStart.bind(this)
    this.onWebpackDone = this.onWebpackDone.bind(this)
    this.logManualCommand = once(this.logManualCommand.bind(this))

    this.runCount = 0
    this.compileCount = 0
    this.activeRun = null
    this.testQueue = new TestQueue(this)
    this.log = new Log(process.stdout, this.config.log)
  }

  init() {
    const { config, configFile, onWebpackStart, onWebpackDone } = this

    this.compiler = webpack(configFile)

    // get notified at the begining of compilation
    this.compiler.plugin('compile', onWebpackStart)

    if (config.watch) {
      // watch and notify of each rebuild
      this.watcher = this.compiler.watch({}, onWebpackDone)
    } else {
      // run once and notify of completion
      this.compiler.run(onWebpackDone)
    }
  }

  onWebpackStart() {
    const { runCount, log, config: { manual } } = this

    this.compileCount += 1
    if (runCount > 0) {
      log.clearScreen()
    }

    if (this.activeRun) {
      this.log.warning('aborting test run')
      this.abortRun()
    }

    if (runCount > 0) {
      log.progress('webpack re-bundling')
    } else {
      log.progress('webpack bundling')
    }

    if (!manual) {
      this.createRun()
    }
  }

  onWebpackDone(err, stats) {
    const { log, testQueue, activeRun } = this

    log.endProgress()
    log.webpackStats(stats)

    if (stats.hasErrors()) {
      log.error('skipping tests because of bundle errors')
      return
    }

    if (this.startRun(stats)) {
      activeRun.on('complete', (exitCode) => {
        this.activeRun = null
        testQueue.clear()

        if (!this.config.watch) {
          process.exit(exitCode)
        }
      })
    }
  }

  createRun() {
    this.activeRun = new TestRun(this.log, {
      cwd: this.config.cwd,
    })
  }

  abortRun() {
    if (this.activeRun) {
      this.activeRun.abort()
      this.activeRun = null
    }
  }

  startRun(stats) {
    const { activeRun, log, testQueue, config: { manual } } = this

    if (manual) {
      this.logManualCommand(stats)
      return false
    }

    const runCount = ++this.runCount

    if (runCount === 1) {
      // test everything
      activeRun.test(false, this.makeArgv(stats))
      return true
    }

    const idsToTest = testQueue.addFromStats(stats)
    if (!idsToTest.length) {
      log.info('no tests to run based on the changes')
      this.abortRun()
      return false
    }

    activeRun.test(idsToTest, this.makeArgv(stats))
    return true
  }

  makeArgv(stats) {
    return [...this.config.execArgv, ...findJsOutput(stats)]
  }

  abort() {
    return new Promise(res => {
      if (this.activeRun) {
        this.activeRun.abort()
        this.activeRun = null
      }

      if (this.watcher) {
        this.watcher.close(res)
      } else {
        res()
      }
    })
  }

  logManualCommand(stats) {
    const { watch, execArgv, cwd } = this.config
    const argv = shellEscape([
      ...(watch ? ['--watch'] : []),
      ...execArgv,
    ])

    this.log.info(`Run the following in another shell to execute the tests

  cd ${cwd}
  mocha ${argv}${argv ? ' ' : ''}${findJsOutput(stats).join(' ')}

`)
  }
}
