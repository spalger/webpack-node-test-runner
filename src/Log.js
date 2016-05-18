import logUpdate from 'log-update'
import logSymbols from 'log-symbols'
import { format } from 'util'

let timerId
const frames = ['-', '\\', '|', '/']

export class Log {
  progress(msg) {
    const tick = () => {
      frames.unshift(frames.pop())

      logUpdate(
        '\n' +
        `    ${msg} ${frames[0]}\n` +
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
    console.log(...args)
  }

  clearScreen() {
    this.endProgress()

    // clear screen
    process.stdout.write('\u001b[2J')
    // set cursor position
    process.stdout.write('\u001b[1;0H')
  }
}
