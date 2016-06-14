import logUpdate from 'log-update'
import logSymbols from 'log-symbols'
import { format } from 'util'
import supportsColor from 'supports-color'
import defaults from 'lodash/defaults'

let timerId
const progressFrames = ['-', '\\', '|', '/']

export class Log {
  constructor(to, config) {
    this.to = to
    this.config = defaults(config || {}, {
      clear: true,
      webpackStats: true,
      silent: false,
    })
  }

  logRunner(runner) {
    runner.consumeReports({
      testRunAborted: () => {
        this.warning('aborting test run')
      },

      testRunSkip: () => {
        this.info('no tests to run based on the changes')
      },

      testRunStart: ids => {
        if (ids) {
          this.info('running %d test modules', ids.length)
        } else {
          this.info('running all test')
        }
      },

      webpackStart: runCount => {
        if (!runCount) {
          this.progress('webpack bundling')
        } else {
          this.clearScreen()
          this.progress('webpack re-bundling')
        }
      },

      webpackDone: stats => {
        this.endProgress()
        this.webpackStats(stats)

        if (stats.hasErrors()) {
          this.error('skipping tests because of bundle errors')
        }
      },

      manualTestRunInstructions: cmd => {
        this.info(cmd)
      },
    })
  }

  progress(msg) {
    if (this.config.silent) return

    if (!this.config.progress) {
      this.write(`${msg} ...\n`)
      return
    }

    const tick = () => {
      progressFrames.unshift(progressFrames.pop())

      logUpdate(
        '\n' +
        `    ${msg} ${progressFrames[0]}\n` +
        '\n'
      )

      timerId = setTimeout(tick, 100)
    }

    tick()
  }

  endProgress() {
    if (timerId != null) {
      clearTimeout(timerId)
      timerId = null
      logUpdate.clear()
    }
  }

  success(...args) {
    this.write(logSymbols.success, format(...args))
  }

  warning(...args) {
    this.write(logSymbols.warning, format(...args))
  }

  error(...args) {
    this.write(logSymbols.error, format(...args))
  }

  info(...args) {
    this.write(logSymbols.info, format(...args))
  }

  write(...args) {
    this.endProgress()
    if (this.config.silent) return
    this.to.write(format(...args))
  }

  webpackStats(stats) {
    if (this.config.webpackStats || stats.hasErrors()) {
      this.write(stats.toString({
        cached: false,
        cachedAssets: false,
        colors: supportsColor,
      }))
    }
  }

  clearScreen() {
    this.endProgress()
    if (!this.config.silent && this.config.clear) {
      // clear screen and update cursor position
      this.to.write('\u001b[2J\u001b[1;0H')
    }
  }
}
