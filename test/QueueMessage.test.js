const chai = require('chai')
const assert = chai.assert
const expect = chai.expect

const QueueMessage = require('../src/QueueMessage')

describe('QueueMessage', () => {
  const okStatus = 'ok'
  const errorStatus = 'error'
  const data = 'This is a valid QueueMessage'

  const number = 1
  const string = 'hello ŰÁÉÚŐÓÜÖÍűáéúőóüöí$\\`#^+-[]<>*;~!%/()孫詒讓\u1FFF\u{10FFFF}'
  const array = [1, 2, 3]
  const buffer = Buffer.from('test buffer')
  const object = { number, string, array, buffer }

  it('#fromJSON() returns a QueueMessage with status "error" if it receives an invalid QueueMessage', () => {
    const badQueueMessage = 'thisIsNotAQueueMessage'
    assert.strictEqual(QueueMessage.fromJSON(badQueueMessage).status, errorStatus)
  })

  it('#fromJSON() parses the stringified QueueMessage with the correct status', () => {
    const goodQueueMessage = JSON.stringify(new QueueMessage(okStatus, data))
    assert.strictEqual(QueueMessage.fromJSON(goodQueueMessage).status, okStatus)
  })

  it('#fromJSON() parses the stringified QueueMessage containing a number', () => {
    const queueMessage = JSON.stringify(new QueueMessage(okStatus, number))
    const data = QueueMessage.fromJSON(queueMessage).data
    assert.strictEqual(data, number)
  })

  it('#fromJSON() parses the stringified QueueMessage containing a string', () => {
    const queueMessage = JSON.stringify(new QueueMessage(okStatus, string))
    const data = QueueMessage.fromJSON(queueMessage).data
    assert.strictEqual(data, string)
  })

  it('#fromJSON() parses the serialized QueueMessage containing an array', () => {
    const queueMessage = JSON.stringify(new QueueMessage(okStatus, array))
    const data = QueueMessage.fromJSON(queueMessage).data
    assert.isArray(data, array)
    assert.sameMembers(data, array)
  })

  it('#fromJSON() parses the serialized QueueMessage containing a buffer', () => {
    const queueMessage = JSON.stringify(new QueueMessage(okStatus, buffer))
    const data = QueueMessage.fromJSON(queueMessage).data
    const _buffer = Buffer.from(data)
    assert.strictEqual(_buffer.toString('utf8'), 'test buffer', 'buffer content not match')
  })

  it('#fromJSON() parses the serialized QueueMessage containing an object', () => {
    const queueMessage = JSON.stringify(new QueueMessage(okStatus, object))
    const data = QueueMessage.fromJSON(queueMessage).data
    assert.isObject(data, 'not an object')
    assert.hasAllKeys(data, ['number', 'string', 'array', 'buffer'], 'object members not match')
    assert.strictEqual(data.number, number, 'number not match')
    assert.strictEqual(data.string, string, 'string not match')
    assert.isArray(data.array, array, 'not an array')
    assert.sameMembers(data.array, array, 'array members not match')
    const buffer = Buffer.from(data.buffer)
    assert.strictEqual(buffer.toString('utf8'), 'test buffer', 'buffer content not match')
  })

  it('#serialize() serialize the QueueMessage to a Buffer', () => {
    const queueMessage = new QueueMessage(okStatus, object, 100)
    queueMessage.addAttachment('test1', Buffer.from('test1'))
    queueMessage.addAttachment('test2', Buffer.from('test2'))
    queueMessage.addAttachment('test3', Buffer.from('test3'))
    queueMessage.addAttachment('test4', Buffer.from('test4'))
    const queueMessageBuffer = queueMessage.serialize()
    expect(queueMessageBuffer).to.be.instanceof(Buffer)
  })

  it('#unserialize() deserialize the QueueMessage to the original QueueMessage', () => {
    const queueMessage = new QueueMessage(okStatus, object, 100)
    queueMessage.addAttachment('test1', Buffer.from('test1'))
    queueMessage.addAttachment('test2', Buffer.from('test2'))
    queueMessage.addAttachment('test3', Buffer.from('test3'))
    queueMessage.addAttachment('test4', Buffer.from('test4'))
    const queueMessageBuffer = queueMessage.serialize()
    const newQueueMessage = QueueMessage.unserialize(queueMessageBuffer)
    assert.strictEqual(newQueueMessage.status, okStatus, 'status not match')

    const data = newQueueMessage.data
    assert.isObject(data, 'not an object')
    assert.hasAllKeys(data, ['number', 'string', 'array', 'buffer'], 'object members not match')
    assert.strictEqual(data.number, number, 'number not match')
    assert.strictEqual(data.string, string, 'string not match')
    assert.isArray(data.array, array, 'not an array')
    assert.sameMembers(data.array, array, 'array members not match')
    const buffer = Buffer.from(data.buffer)
    assert.strictEqual(buffer.toString('utf8'), 'test buffer', 'buffer content not match')

    assert.strictEqual(newQueueMessage.timeOut, 100, 'timeout not match')

    newQueueMessage.getAttachments().forEach((value, key) => {
      assert.strictEqual(value.toString(), queueMessage.getAttachments().get(key).toString(), 'attachement not match')
    })
  })
})
