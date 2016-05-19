import logUpdate from 'log-update'
import logSymbols from 'log-symbols'
import { format } from 'util'
import supportsColor from 'supports-color'
import defaults from 'lodash.defaults'

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

  progress(msg) {
    if (this.config.silent) return

    if (!this.config.progress) {
      this.write(`${msg} ...`)
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
    this.to.write(...args)
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

    if (this.config.silent) return
    if (!this.config.clear) return

    // clear screen
    process.stdout.write('\u001b[2J')
    // set cursor position
    process.stdout.write('\u001b[1;0H')
  }
}
