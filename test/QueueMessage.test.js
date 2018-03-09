const chai = require('chai')
let assert = chai.assert

const QueueMessage = require('../src/QueueMessage')

describe('QueueMessage', () => {
  const number = 1
  const string = 'hello'
  const array = [1, 2, 3]
  const buffer = Buffer.from('test buffer')
  const object = { number, string, array, buffer }
  const cyclic = {}
  cyclic.cycle = cyclic

  it('#serialize() returns a string', () => {
    let qm = new QueueMessage()
    assert.isString(qm.serialize(), 'serialize did not return a string')
  })

  it('#serialize() throws if the contents are malformed', () => {
    let qm = new QueueMessage()
    qm.setBody(cyclic)
    assert.throws(() => {
      qm.serialize()
    })
  })

  it('#deserialize() returns a QueueMessage', () => {
    let qm = QueueMessage.deserialize()
    assert.instanceOf(qm, QueueMessage, 'not a QueueMessage instance')
  })

  it('#deserialize() returns a QueueMessage even if the content is malformed', () => {
    let qm = QueueMessage.deserialize('not a json')
    assert.instanceOf(qm, QueueMessage, 'not a QueueMessage instance')
  })

  it('#deserialize() returns a QueueMessage with an error if it receives invalid content', () => {
    let badQueueMessage = 'thisIsNotAQueueMessage'
    let qm = QueueMessage.deserialize(badQueueMessage)
    assert.isString(qm.error)
    assert.strictEqual(qm.error, QueueMessage.ERROR_MESSAGE_MALFORMED)
  })

  it('#deserialize() parses the stringified QueueMessage containing a number', () => {
    let queueMessage = new QueueMessage(number).serialize()
    let data = QueueMessage.deserialize(queueMessage).body
    assert.strictEqual(data, number)
  })

  it('#deserialize() parses the stringified QueueMessage containing a string', () => {
    let queueMessage = new QueueMessage(string).serialize()
    let data = QueueMessage.deserialize(queueMessage).body
    assert.strictEqual(data, string)
  })

  it('#deserialize() parses the serialized QueueMessage containing an array', () => {
    let queueMessage = new QueueMessage(array).serialize()
    let data = QueueMessage.deserialize(queueMessage).body
    assert.isArray(data, array)
    assert.sameMembers(data, array)
  })

  it('#deserialize() parses the serialized QueueMessage containing a buffer', () => {
    let queueMessage = new QueueMessage(buffer).serialize()
    let data = QueueMessage.deserialize(queueMessage).body
    let _buffer = Buffer.from(data)
    assert.strictEqual(_buffer.toString('utf8'), 'test buffer', 'buffer content not match')
  })

  it('#deserialize() parses the serialized QueueMessage containing an object', () => {
    let queueMessage = new QueueMessage(object).serialize()
    let data = QueueMessage.deserialize(queueMessage).body
    assert.isObject(data, 'not an object')
    assert.hasAllKeys(data, ['number', 'string', 'array', 'buffer'], 'object members not match')
    assert.strictEqual(data.number, number, 'number not match')
    assert.strictEqual(data.string, string, 'string not match')
    assert.isArray(data.array, array, 'not an array')
    assert.sameMembers(data.array, array, 'array members not match')
    let buffer = Buffer.from(data.buffer)
    assert.strictEqual(buffer.toString('utf8'), 'test buffer', 'buffer content not match')
  })
})
