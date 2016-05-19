/* eslint-env mocha */

import { Runner } from '../Runner'
import { resolve } from 'path'
import touch from 'touch'
import expect, { deepEqual } from 'expect-to'
import del from 'del'

const moduleId = (stats, path) =>
  stats.compilation.modules.find(m => m.resource === path).id

let runner
function createRunnerSetup(fixture) {
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
        watch: true,
        webpackConfigFile: 'webpack.config.js',
        log: {
          silent: true,
        },
      })

      runner.createRun = () => false
      runner.startRun = () => false
    })
  )

  afterEach(() => runner.abort())
}

describe('Strategic Test Rerun', () => {
  describe('basic-project', () => {
    const fixture = resolve.bind(null, __dirname, '../../fixtures/basic-project')
    createRunnerSetup(fixture)

    it('finds immediate dependencies based on changed file', done => {
      runner.onWebpackDone = (err, stats) => {
        if (err) {
          throw err
        }

        if (stats.hasErrors()) {
          runner.log.webpackStats(stats)
          throw new Error('webpack build has errors')
        }

        if (runner.compileCount === 1) {
          setTimeout(() => touch.sync(fixture('src/repeatString.js')), 200)
        } else {
          const idsToTest = runner.testQueue.addFromStats(stats)
          expect(idsToTest).to(deepEqual([
            moduleId(stats, fixture('src/repeatString.test.js')),
          ]))
          done()
        }
      }

      runner.init()
    })
  })

  describe('multi-level-project', () => {
    const fixture = resolve.bind(null, __dirname, '../../fixtures/multi-level-project')
    createRunnerSetup(fixture)

    it('finds extended dependencies based on changed file', done => {
      runner.onWebpackDone = (err, stats) => {
        if (err) throw err

        if (stats.hasErrors()) {
          runner.log.webpackStats(stats)
          throw new Error('webpack build has errors')
        }

        if (runner.compileCount === 1) {
          setTimeout(() => touch.sync(fixture('src/repeatString.js')), 200)
        } else {
          const idsToTest = runner.testQueue.addFromStats(stats)
          expect(idsToTest).to(deepEqual([
            moduleId(stats, fixture('src/leftPad.test.js')),
            moduleId(stats, fixture('src/repeatString.test.js')),
          ]))
          done()
        }
      }

      runner.init()
    })
  })
})
