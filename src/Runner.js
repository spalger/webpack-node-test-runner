import webpack from 'webpack'
import { relative, resolve } from 'path'
import defaults from 'lodash/defaults'
import shellEscape from 'shell-escape'
import reportable from 'reportable'

import { TestRun } from './TestRun'
import { TestQueue } from './TestQueue'
import { findJsOutput } from './lib'

export class Runner {
  constructor(config) {
    reportable(this, [
      'initialized',
      'webpackStart',
      'webpackDone',
      'testRunStart',
      'testRunAborted',
      'testRunSkipped',
      'testRunComplete',
      'manualTestRunInstructions',
    ])

    this.config = defaults(config || {}, {
      cwd: process.cwd(),
      execArgv: [],
      watch: true,
      manual: false,
      webpackConfigFile: 'webpack.config.js',
    })

    const configFilePath = require.resolve(resolve(config.cwd, config.webpackConfigFile))
    this.configFile = require(configFilePath) // eslint-disable-line global-require
    delete require.cache[configFilePath]

    this.onWebpackStart = this.onWebpackStart.bind(this)
    this.onWebpackDone = this.onWebpackDone.bind(this)

    this.runCount = 0
    this.compileCount = 0
    this.activeRun = null
    this.testQueue = new TestQueue(this)
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

    this.report.initialized()
  }

  onWebpackStart() {
    const { runCount, config: { manual } } = this

    this.compileCount += 1
    this.report.webpackStart(runCount)
    this.abortRun()

    if (!manual) {
      this.createRun()
    }
  }

  onWebpackDone(err, stats) {
    const { testQueue, activeRun } = this

    this.report.webpackDone(stats)

    if (stats.hasErrors()) {
      this.abortRun()
      if (!this.config.watch) {
        process.exit(1)
      }
      return
    }

    if (this.startRun(stats)) {
      activeRun.on('complete', (exitCode) => {
        this.activeRun = null
        testQueue.clear()
        this.report.testRunComplete()

        if (!this.config.watch) {
          process.exit(exitCode)
        }
      })
    }
  }

  createRun() {
    this.activeRun = new TestRun({
      cwd: this.config.cwd,
    })
  }

  abortRun() {
    if (this.activeRun) {
      this.cancelRun()
      this.report.testRunAborted()
    }
  }

  cancelRun() {
    if (this.activeRun) {
      this.activeRun.abort()
      this.activeRun = null
    }
  }

  startRun(stats) {
    const { activeRun, testQueue, config: { manual } } = this

    if (manual) {
      this.report.manualTestRunInstructions(this.createManualCommand(stats))
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
      this.cancelRun()
      this.report.testRunSkipped()
      return false
    }

    this.report.testRunStart()
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

  createManualCommand(stats) {
    const { watch, execArgv, cwd } = this.config
    const r = path => relative(process.cwd(), path)

    const relCwd = watch ? cwd : r(cwd)
    const testOutput = findJsOutput(stats).map(r)
    const argv = shellEscape([
      ...(watch ? ['--watch'] : []),
      ...execArgv,
    ])

    const cmds = [
      relCwd ? `cd ${relCwd}` : '',
      `mocha ${argv}${argv ? ' ' : ''}${testOutput.join(' ')}`,
    ].filter(Boolean)

    return `Run the following ${watch ? 'in another shell ' : ''}to execute the tests

  ${cmds.join('\n  ')}

`
  }
}
