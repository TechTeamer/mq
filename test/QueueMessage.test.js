const chai = require('chai')
let expect = chai.expect

const QueueMessage = require('../src/QueueMessage')

describe('QueueMessage', () => {
  let status = 'ok'
  let data = 'This is a valid QueueMessage'

  let badQueueMessage = 'thisIsNotAQueueMessage'
  let goodQueueMessage = JSON.stringify(new QueueMessage(status, data))

  it('#fromJSON() returns a QueueMessage with status "error" if it receives an invalid QueueMessage', () => {
    return expect((QueueMessage.fromJSON(badQueueMessage)).status).to.equal('error')
  })

  it('#fromJSON() parses the stringified QueueMessage with the correct status', () => {
    return expect((QueueMessage.fromJSON(goodQueueMessage)).status).to.equal(status)
  })

  it('#fromJSON() parses the stringified QueueMessage with the correct data', () => {
    return expect((QueueMessage.fromJSON(goodQueueMessage)).data).to.equal(data)
  })
})
