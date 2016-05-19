/* eslint-env mocha */

import { Log } from '../Log'
import expect, { be, contain } from 'expect-to'

import {
  beGTE,
  makeCounterLog,
  makeConcatLog,
  makeMockStats,
  makeCounterStream,
  useAllWriteMethods,
} from './helpers'

describe('Log', () => {
  it('logs to stream passed', () => {
    const str = makeCounterStream()
    const log = new Log(str)
    log.info('blarg')
    expect(str.count).to(beGTE(1))
  })

  describe('config', () => {
    context('{ silent: true }', () => {
      it('does not log anything', () => {
        const { str, log } = makeCounterLog({ silent: true })
        useAllWriteMethods(log)
        expect(str.count).to(be(0))
      })

      context('{ clear: true }', () => {
        it('does not log anything', () => {
          const { str, log } = makeCounterLog({ silent: true, clear: true })
          useAllWriteMethods(log)
          expect(str.count).to(be(0))
        })
      })

      context('{ webpackStats: true }', () => {
        it('does not log anything', () => {
          const { str, log } = makeCounterLog({ silent: true, webpackStats: true })
          useAllWriteMethods(log)
          expect(str.count).to(be(0))
        })
      })
    })

    context('{ silent: undefined }', () => {
      it('logs as normal', () => {
        const { str, log } = makeCounterLog()
        useAllWriteMethods(log)
        expect(str.count).to(beGTE(0))
      })

      context('{ clear: true }', () => {
        it('injects the "clear" escape codes', () => {
          const { log, str } = makeConcatLog({ clear: true })
          useAllWriteMethods(log)
          const out = str.getBody()
          expect(out).to(contain('\u001b[2J'))
          expect(out).to(contain('\u001b[1;0H'))
        })
      })

      context('{ webpackStats: true }', () => {
        context('stats had errors', () => {
          it('Logs the output of stats.toString()', () => {
            const { str, log } = makeConcatLog({ webpackStats: true })
            log.webpackStats(makeMockStats(true))
            expect(str.getBody()).to(be('webpack stats as a string'))
          })
        })

        context('stats did not have errors', () => {
          it('Logs the output of stats.toString()', () => {
            const { str, log } = makeConcatLog({ webpackStats: true })
            log.webpackStats(makeMockStats(false))
            expect(str.getBody()).to(be('webpack stats as a string'))
          })
        })
      })

      context('{ webpackStats: false }', () => {
        context('stats had errors', () => {
          it('Still logs the output of stats.toString()', () => {
            const { str, log } = makeConcatLog({ webpackStats: false })
            log.webpackStats(makeMockStats(true))
            expect(str.getBody()).to(be('webpack stats as a string'))
          })
        })

        context('stats did not have errors', () => {
          it('Logs nothing', () => {
            const { str, log } = makeConcatLog({ webpackStats: false })
            log.webpackStats(makeMockStats(false))
            expect(str.getBody()).to(be(''))
          })
        })
      })
    })
  })
})
