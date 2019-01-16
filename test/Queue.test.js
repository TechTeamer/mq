const assert = require('assert')
const QueueManager = require('../src/QueueManager')
const ConsoleInspector = require('./consoleInspector')
const SeedRandom = require('seed-random')
let config = require('./config/LoadConfig')

describe('QueueClient && QueueServer', () => {
  let queueName = 'test-queue'
  const logger = new ConsoleInspector(console)
  let maxRetry = 5

  let clientManager = new QueueManager(config)
  clientManager.setLogger(logger)
  let queueClient = clientManager.getQueueClient(queueName)

  let serverManager = new QueueManager(config)
  serverManager.setLogger(logger)
  let options = { prefetchCount: 1, maxRetry, timeoutMs: 10000 }
  let queueServer = serverManager.getQueueServer(queueName, options)

  before(() => {
    return clientManager.connect().then(() => {
      return serverManager.connect()
    })
  })

  after(() => {
    logger.empty()
  })

  it('QueueClient.send() sends a STRING and QueueServer.consume() receives it', (done) => {
    let stringMessage = 'foobar'
    queueServer.consume((msg) => {
      if (msg.data !== stringMessage) {
        done(new Error('String received is not the same as the String sent'))
        return
      }

      done()
    })
    queueClient.send(stringMessage).catch((err) => {
      done(err)
    })
  })

  it('QueueClient.send() sends an OBJECT and QueueServer.consume() receives it', (done) => {
    let objectMessage = { foo: 'bar', bar: 'foo' }
    queueServer.consume((msg) => {
      if (JSON.stringify(msg.data) !== JSON.stringify(objectMessage)) {
        done(new Error('The send OBJECT is not equal to the received one'))
        return
      }
      done()
    })
    queueClient.send(objectMessage).catch((err) => {
      done(err)
    })
  })

  it('QueueClient.send() throws an error when the parameter is not json-serializeable', (done) => {
    let nonJSONSerializableMessage = {}
    nonJSONSerializableMessage.a = { b: nonJSONSerializableMessage }

    queueServer.consume((msg) => {
      done(new Error('Should not receive the message'))
    })

    queueClient.send(nonJSONSerializableMessage)
      .then(() => done(new Error('Sending a non-json-serializeable object did not throw an error')))
      .catch(() => done())
  })

  it('QueueClient.send() sends a message with a 100MB random generated buffer and QueueServer.consume() receives it', function (done) {
    let stringMessage = 'foobar'
    let attachments = new Map()

    var rand = SeedRandom()
    let buf = Buffer.alloc(102400)

    for (let i = 0; i < 102400; ++i) {
      buf[i] = (rand() * 255) << 0
    }

    attachments.set('test', buf)

    queueServer.consume((msg) => {
      if (msg.getAttachments().get('test').toString() !== buf.toString()) {
        done(new Error('String received is not the same as the String sent'))
        return
      }
      done()
    })

    queueClient.send(stringMessage, null, null, attachments).catch((err) => {
      done(err)
    })
  })

  it(`QueueServer.consume() tries to receive message for ${maxRetry + 1} times`, (done) => {
    let consumeCalled = 0
    let objectMessage = { foo: 'bar', bar: 'foo' }

    queueServer.consume((msg) => {
      consumeCalled++
      if (consumeCalled > maxRetry + 1) {
        done(new Error(`Tried more times than limit: ${maxRetry}`))
        return
      }
      throw new Error('message not processed well')
    })

    queueClient.send(objectMessage).catch((err) => {
      done(err)
    })

    setTimeout(() => {
      assert.strictEqual(consumeCalled, maxRetry + 1, '')
      done()
    }, 1000)
  })
})
