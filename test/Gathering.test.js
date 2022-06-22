const QueueManager = require('../src/QueueManager')
const ConsoleInspector = require('./consoleInspector')
const SeedRandom = require('seed-random')
const config = require('./config/LoadConfig')

describe('GatheringClient && GatheringServer', () => {
  const gatheringName = 'techteamer-mq-js-test-gathering'
  const logger = new ConsoleInspector(console)
  const timeoutMs = 1000
  const assertExchangeOptions = { durable: false, autoDelete: true }

  const queueManager = new QueueManager(config)
  queueManager.setLogger(logger)

  const gatheringClient = queueManager.getGatheringClient(gatheringName, { queueMaxSize: 100, timeoutMs, assertExchange: assertExchangeOptions })
  const gatheringServer1 = queueManager.getGatheringServer(gatheringName, { prefetchCount: 1, timeoutMs, assertExchange: assertExchangeOptions })

  before(() => {
    return queueManager.connect()
  })

  after(() => {
    logger.empty()
  })

  it('GatheringClient.request() sends a STRING and GatheringServer.consume() receives it', (done) => {
    const stringMessage = 'foobar'
    gatheringServer1.consume((msg) => {
      if (msg === stringMessage) {
        done()
      } else {
        done(new Error('String received is not the same as the String sent'))
      }
      return true
    })
    gatheringClient.request(stringMessage, 10000).catch((err) => {
      done(err)
    })
  })

  it('GatheringClient.request() sends an OBJECT and GatheringServer.consume() receives it', (done) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }
    gatheringServer1.consume((msg) => {
      if (JSON.stringify(msg) === JSON.stringify(objectMessage)) {
        done()
      } else {
        done(new Error('The send OBJECT is not equal to the received one'))
      }
      return true
    })
    gatheringClient.request(objectMessage, 10000).catch((err) => {
      done(err)
    })
  })

  it('GatheringClient.request() sends an OBJECT, GatheringServer.consume() sends it back and GatheringClient receives it intact', (done) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }
    gatheringServer1.consume((msg) => {
      return msg
    })
    gatheringClient.request(objectMessage, 10000).then((res) => {
      if (JSON.stringify(res) === JSON.stringify(objectMessage)) {
        done()
      } else {
        done(new Error(`Object sent and received are not equal: ${JSON.stringify(res)}`))
      }
    }).catch((err) => {
      done(err)
    })
  })

  it('GatheringClient.request() sends an OBJECT, GatheringServer.consume() sends back a response' +
    'with a 100MB random generated buffer and GatheringClient receives it', (done) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }

    const rand = SeedRandom()
    const buf = Buffer.alloc(102400)
    for (let i = 0; i < 102400; ++i) {
      buf[i] = (rand() * 255) << 0
    }

    gatheringServer1.consume((msg, request, response) => {
      response.addAttachment('test', buf)
      if (!response.hasAnyAttachments()) {
        done(new Error('Missing attachment from response'))
      }
      if (!response.hasAttachment('test')) {
        done(new Error('Missing attachment name "test" from response'))
      }
      if (!response.getAttachment('test') === buf) {
        done(new Error('Attachment name "test" is not the same'))
      }
      return msg
    })
    gatheringClient.request(objectMessage, 10000, null, true).then((res) => {
      if (!res.hasAttachment('test')) {
        done(new Error('Missing attachment from reply'))
      } else if (!(res.getAttachment('test') instanceof Buffer)) {
        done(new Error('Attachment is not a buffer'))
      } else if (res.getAttachment('test').toString() !== buf.toString()) {
        done(new Error('String received is not the same as the String sent'))
      } else {
        done()
      }
    }).catch((err) => {
      done(err)
    })
  })

  it('gatheringClient.request() sends a message with a 100MB random generated buffer and gatheringServer1.consume() receives it', function (done) {
    const stringMessage = 'foobar'
    const attachments = new Map()

    const rand = SeedRandom()
    const buf = Buffer.alloc(102400)

    for (let i = 0; i < 102400; ++i) {
      buf[i] = (rand() * 255) << 0
    }

    attachments.set('test', buf)

    gatheringServer1.consume((msg, queueMessage) => {
      if (queueMessage.getAttachments().get('test').toString() !== buf.toString()) {
        done(new Error('String received is not the same as the String sent'))
        return true
      }
      done()
      return true
    })

    gatheringClient.request(stringMessage, null, attachments).catch((err) => {
      done(err)
    })
  })

  it('GatheringClient.request() throws an error when the parameter cant be JSON-serialized', (done) => {
    const nonJSONSerializableMessage = {}
    nonJSONSerializableMessage.a = { b: nonJSONSerializableMessage }

    gatheringServer1.consume((msg) => {
      done(new Error('Should not receive the message'))
      return true
    })

    gatheringClient.request(nonJSONSerializableMessage)
      .then(() => done(new Error('Did not throw an error')))
      .catch(() => done())
  })

  it(`GatheringClient.request() throws an error if it doesn't receive a response sooner than ${timeoutMs}ms`, (done) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }

    gatheringServer1.consume((msg) => {
      const now = Date.now()
      // eslint-disable-next-line no-empty
      while (new Date().getTime() < now + timeoutMs + 100) { }
      return msg
    })

    gatheringClient.request(objectMessage)
      .then(() => done(new Error('Did not throw a timeout error')))
      .catch(() => done())
  })

  it('gatheringClient.request() rejects when a consumer sets an error status', (done) => {
    const messageBody = 'hello'
    gatheringServer1.consume((msg, message, response) => {
      // undefined is implied not found
      response.setStatus(response.ERROR, 'HELLO_ERROR')
    })

    gatheringClient.request(messageBody, 10000, null, false, false).then(() => {
      done(new Error('Should have rejected'))
    }).catch((err) => {
      if (err.message === 'HELLO_ERROR') {
        done()
      } else {
        done(new Error(err.message))
      }
    })
  })

  it('gatheringClient.request() rejects when a consumer sends malformed message', (done) => {
    const messageBody = 'hello'
    gatheringServer1.consume(() => {
      // undefined is implied not found
      const obj = {}
      obj.a = { b: obj }
      return obj
    })

    gatheringClient.request(messageBody, 10000, null, false, false).then(() => {
      done(new Error('Should have rejected'))
    }).catch((err) => {
      if (err.message === 'failed to construct reply') {
        done()
      } else {
        done(new Error(err.message))
      }
    })
  })

  it('gatheringClient.request() rejects when a consumer throws an error', (done) => {
    const messageBody = 'hello'
    gatheringServer1.consume(() => {
      // undefined is implied not found
      throw new Error('HELLO_ERROR')
    })

    gatheringClient.request(messageBody, 10000, null, false, false).then(() => {
      done(new Error('Should reject when one of the consumers reject'))
    }).catch((err) => {
      if (err.message === 'response failed') {
        done()
      } else {
        done(new Error(err.message))
      }
    })
  })
})
