const leftPad = require('./leftPad')
const assert = require('assert')

describe('leftPad', () => {
  it('make a string 10 chars long', () => {
    assert.ok(leftPad('a', 10).length === 10, 'return value should be 10 characters long')
  })
})
