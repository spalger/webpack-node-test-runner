import cp from 'child_process'
import { EventEmitter } from 'events'
import { resolve } from 'path'

export class TestRunner extends EventEmitter {
  constructor() {
    super()

    this.onProcExit = this.onProcExit.bind(this)

    this.child = cp.fork(
      resolve(__dirname, './worker.js'),
      [],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'inherit',
      }
    )

    this.child.on('exit', this.onProcExit)
  }

  test(idsToTest, argv) {
    this.child.send({ idsToTest, argv })
  }

  abort() {
    this.aborted = true
    this.child.removeListener('exit', this.onProcExit)
    this.child.kill() // :'(
  }

  onProcExit(code) {
    this.emit('complete', !code)
  }
}
