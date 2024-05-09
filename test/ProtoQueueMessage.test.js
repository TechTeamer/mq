import chai from 'chai'
import path from 'node:path'
import protobuf from 'protobufjs'
import QueueMessage from '../src/QueueMessage.js'
import ProtoQueueMessage from '../src/ProtoQueueMessage.js'

const assert = chai.assert
const expect = chai.expect
describe('ProtoQueueMessage', () => {
  const okStatus = 'ok'

  const number = 1
  const string = 'hello ŰÁÉÚŐÓÜÖÍűáéúőóüöí$\\`#^+-[]<>*;~!%/()孫詒讓\u1FFF\u{10FFFF}'
  const array = [1, 2, 3]
  const testBuffer = Buffer.from(string)
  const testData = { number, string, array, buffer: testBuffer }
  let TestMessage

  before(async () => {
    const RootProtobuf = await protobuf.load(path.join(process.cwd(), 'test/contentSchemas/protobuf_test_schema.proto'))
    TestMessage = RootProtobuf.lookup('TestMessage')
  })

  it('#fromJSON() returns a QueueMessage instance', () => {
    assert.instanceOf(ProtoQueueMessage.fromJSON({}), QueueMessage)
  })

  it('#serialize() serialize the ProtoQueueMessage to a Buffer', () => {
    const queueMessage = new ProtoQueueMessage(okStatus, testData, 100, TestMessage)
    queueMessage.addAttachment('testBuffer', Buffer.from('testBuffer'))
    const queueMessageBuffer = queueMessage.serialize()
    expect(queueMessageBuffer).to.be.instanceof(Buffer)
  })

  it('#unserialize() deserialize the QueueMessage to the original QueueMessage', () => {
    const queueMessage = new ProtoQueueMessage(okStatus, testData, 100, TestMessage)
    queueMessage.addAttachment('testBuffer', Buffer.from('testBuffer'))
    const queueMessageBuffer = queueMessage.serialize()
    const newQueueMessage = ProtoQueueMessage.unserialize(queueMessageBuffer, TestMessage)
    assert.strictEqual(newQueueMessage.status, okStatus, 'status not match')

    const data = newQueueMessage.data
    assert.isObject(data, 'not an object')
    assert.hasAllKeys(data, ['number', 'string', 'array', 'buffer'], 'object members do not match')
    assert.strictEqual(data.number, number, 'number does not match')
    assert.strictEqual(data.string, string, 'string does not match')
    assert.isArray(data.array, array, 'not an array')
    assert.sameMembers(data.array, array, 'array members do not match')
    const buffer = Buffer.from(data.buffer)
    assert.strictEqual(buffer.toString('utf8'), string, 'buffer content does not match')

    assert.strictEqual(newQueueMessage.timeOut, null, 'timeout does not match')

    assert.strictEqual(newQueueMessage.attachments.size, 0, 'attachment count does not match')

    newQueueMessage.getAttachments().forEach((value, key) => {
      assert.strictEqual(value.toString(), queueMessage.getAttachments().get(key).toString(), 'attachment not match')
    })
  })
})
