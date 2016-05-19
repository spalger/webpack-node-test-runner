import cp from 'child_process'
import { EventEmitter } from 'events'
import { resolve } from 'path'

const worker = resolve(__dirname, './worker.js')

export class TestRun extends EventEmitter {
  constructor(runner) {
    super()

    this.runner = runner

    this.onChildExit = this.onChildExit.bind(this)
    this.child = cp.fork(worker, [], { cwd: this.runner.config.cwd })
    this.child.on('exit', this.onChildExit)
  }

  test(idsToTest, argv) {
    if (idsToTest) {
      this.runner.log.info('running %d test modules', idsToTest.length)
    } else {
      this.runner.log.info('running all test')
    }

    this.child.send({ idsToTest, argv })
  }

  abort() {
    this.child.removeListener('exit', this.onChildExit)
    this.child.kill() // :'(
  }

  onChildExit(code) {
    this.emit('complete', !code)
  }
}
