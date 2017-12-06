const QueueClient = require('../src/QueueClient')
const {assert} = require('chai')

describe('QueueMessage', () => {
  it('works', () => {
    let queueClient = new QueueClient()
    assert.isTrue(!!queueClient)
  })
})
