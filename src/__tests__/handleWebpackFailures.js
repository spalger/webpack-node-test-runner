/* eslint-env mocha */

import { Runner } from '../Runner'
import { resolve } from 'path'
import sinon from 'sinon'
import del from 'del'

let runner
function createRunnerSetup({ fixture, watch }) {
  beforeEach(() => del(fixture('dist')))
  afterEach(() => del(fixture('dist')))

  beforeEach(() =>
    Promise.resolve()
    .then(() =>
      new Promise(res =>
        // stupid timeout that seems to be required
        // for webpack to behave predictably, otherwise it
        // won't rebuild files... probably something to do with
        // fsevents maintaining (and needing to maintain) process
        // level state
        setTimeout(res, runner ? 5500 : 0)
      )
    )
    .then(() => {
      runner = new Runner({
        cwd: fixture(),
        watch,
        webpackConfigFile: 'webpack.config.js',
      })

      runner.createRun = () => false
      runner.startRun = () => false
    })
  )

  afterEach(() => runner.abort())
}

let stub
afterEach(() => {
  if (stub) {
    stub.restore()
    stub = null
  }
})

describe('Handling webpack Failures', () => {
  context('--no-watch', () => {
    const fixture = resolve.bind(null, __dirname, '../../fixtures/broken-webpack')
    createRunnerSetup({ fixture, watch: false })

    it('gracefully ends the process with status code 1', (done) => {
      stub = sinon.stub(process, 'exit', status => {
        done(status === 1 ? null : new Error(
          `Runner should have exitted with status of 1, but got ${status}`
        ))
      })

      runner.init()
    })
  })

  context('--watch', () => {
    const fixture = resolve.bind(null, __dirname, '../../fixtures/broken-webpack')
    createRunnerSetup({ fixture, watch: true })

    it('lets the process stay open', (done) => {
      stub = sinon.stub(process, 'exit', () => {
        done(new Error('Runner should not have tried to kill the process'))
      })

      runner.consumeReports({
        webpackDone: () => {
          setTimeout(done, 5000)
        },
      })

      runner.init()
    })
  })
})
