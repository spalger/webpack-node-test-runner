const repeatString = require('./repeatString')
const assert = require('assert')

describe('repeatString', () => {
  it('make a string 5 chars long', () => {
    assert.ok(repeatString('a', 5) === 'aaaaa', 'return value should be "aaaaa"')
  })
})
