import { Runner } from '../src/Runner'
import { resolve } from 'path'
import touch from 'touch'
import expect, { deepEqual } from 'expect-to'
import del from 'del'

const rel = resolve.bind(null, __dirname, 'fixtures')
const moduleId = (stats, path) =>
  stats.compilation.modules.find(m => m.resource === rel(path)).id

let runner
function createRunnerSetup(base) {
  beforeEach(() => del(rel(base, 'dist')))
  afterEach(() => del(rel(base, 'dist')))

  beforeEach(() =>
    Promise.resolve()
    .then(() =>
      new Promise(res =>
        // stupid timeout that seems to be required
        // for webpack to behave predictably
        setTimeout(res, runner ? 5500 : 0)
      )
    )
    .then(() => {
      runner = new Runner({
        cwd: rel(base),
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

describe('TestQueue', () => {
  describe('basic-project', () => {
    createRunnerSetup('basic-project')

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
          setTimeout(() => touch.sync(rel('basic-project/src/repeatString.js')), 200)
        } else {
          const idsToTest = runner.testQueue.addFromStats(stats)
          expect(idsToTest).to(deepEqual([
            moduleId(stats, 'basic-project/src/repeatString.test.js'),
          ]))
          done()
        }
      }

      runner.init()
    })
  })

  describe('multi-level-project', () => {
    createRunnerSetup('multi-level-project')

    it('finds extended dependencies based on changed file', done => {
      runner.onWebpackDone = (err, stats) => {
        if (err) throw err

        if (stats.hasErrors()) {
          runner.log.webpackStats(stats)
          throw new Error('webpack build has errors')
        }

        if (runner.compileCount === 1) {
          setTimeout(() => touch.sync(rel('multi-level-project/src/repeatString.js')), 200)
        } else {
          const idsToTest = runner.testQueue.addFromStats(stats)
          expect(idsToTest).to(deepEqual([
            moduleId(stats, 'multi-level-project/src/leftPad.test.js'),
            moduleId(stats, 'multi-level-project/src/repeatString.test.js'),
          ]))
          done()
        }
      }

      runner.init()
    })
  })
})
