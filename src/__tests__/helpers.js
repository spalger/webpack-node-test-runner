import { Log } from '../Log'
import ConcatStream from 'concat-stream'
import { Writable } from 'stream'

export function makeCounterStream() {
  const stream = new Writable()
  stream.count = 0
  stream.setDefaultEncoding('utf8')
  stream._write = (chunk, encoding, done) => { // eslint-disable-line no-underscore-dangle
    stream.count ++
    done()
  }
  return stream
}

export function beGTE(n) {
  return ({ actual, assert }) =>
    assert(
      actual >= n,
      ['%d should be greater than or equal to %d', actual, n],
      ['%d should not be greater than or equal to %d', actual, n]
    )
}

export function makeCounterLog(config) {
  const str = makeCounterStream()
  const log = new Log(str, config)
  return { str, log }
}

export function makeConcatLog(config) {
  const str = new ConcatStream({ encoding: 'string' })
  const log = new Log(str, config)
  return { str, log }
}

export function makeMockStats(hasErrors) {
  return {
    hasErrors() {
      return !!hasErrors
    },
    toString() {
      return 'webpack stats as a string'
    },
  }
}


export function useAllWriteMethods(log) {
  log.progress('something is happening')
  log.info('something will happen')
  log.warning('danger!')
  log.error('oh noes!')
  log.clearScreen()
  log.webpackStats(makeMockStats())
}
