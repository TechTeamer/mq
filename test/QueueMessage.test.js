const chai = require('chai')
let expect = chai.expect

const QueueMessage = require('../src/QueueMessage')

describe('QueueMessage', () => {
  let status = 'ok'
  let data = 'This is a valid QueueMessage'

  let badQueueMessage = 'thisIsNotAQueueMessage'
  let goodQueueMessage = new QueueMessage(status, data).serialize()

  it('#fromJSON() returns a QueueMessage with status "error" if it receives an invalid QueueMessage', () => {
    return expect((QueueMessage.deserialize(badQueueMessage)).status).to.equal('error')
  })

  it('#fromJSON() parses the serialized QueueMessage with the correct status', () => {
    return expect((QueueMessage.deserialize(goodQueueMessage)).status).to.equal(status)
  })

  it('#fromJSON() parses the serialized QueueMessage with the correct data', () => {
    return expect((QueueMessage.deserialize(goodQueueMessage)).data).to.equal(data)
  })
})
