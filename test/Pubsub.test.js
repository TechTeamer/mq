const assert = require('assert')
const Publisher = require('../src/Publisher')
const Subscriber = require('../src/Subscriber')
const QueueConnection = require('../src/QueueConnection')
const ConsoleInspector = require('./consoleInspector')
let config = require('./config/LoadConfig')

describe('Publisher && Subscriber', () => {
  let publisherName = 'test-publisher'
  const logger = new ConsoleInspector(console)
  let maxRetry = 5

  let publisherConnection = new QueueConnection(config)
  publisherConnection.setLogger(logger)
  let publisher = new Publisher(publisherConnection, logger, publisherName)

  let subscriberConnection = new QueueConnection(config)
  subscriberConnection.setLogger(logger)
  let subscriber = new Subscriber(subscriberConnection, logger, publisherName, {maxRetry, timeoutMs: 10000})

  let initialized = false

  const setupConnections = () => {
    if (initialized) {
      return Promise.resolve()
    }

    initialized = true
    return subscriber.initialize()
  }

  after(() => {
    logger.printLogs()
    logger.empty()
  })

  it('Publisher.send() sends a STRING and Subscriber.consume() receives it', (done) => {
    setupConnections().then(() => {
      let stringMessage = 'foobar'

      subscriber.consume((msg) => {
        if (msg !== stringMessage) {
          done(new Error('String received is not the same as the String sent'))
          return
        }
        done()
      })

      publisher.send(stringMessage)
    })
  })

  it('Publisher.send() sends an OBJECT and Subscriber.consume() receives it', (done) => {
    setupConnections().then(() => {
      let objectMessage = {foo: 'bar', bar: 'foo'}

      subscriber.consume((msg) => {
        if (JSON.stringify(msg) !== JSON.stringify(objectMessage)) {
          done(new Error('The send OBJECT is not equal to the received one'))
          return
        }
        done()
      })

      publisher.send(objectMessage)
    })
  })

  it('Publisher.send() sends a BUFFER, Subscriber.consume() sends it back and Publisher receives it intact', (done) => {
    setupConnections().then(() => {
      let buffer = Buffer.from('test content')
      subscriber.consume((msg) => {
        if (Buffer.isBuffer(msg) && msg.toString('base64') === buffer.toString('base64') && buffer.toString('utf8') === 'test content') {
          done()
        } else {
          done(new Error('Object sent and received are not equal'))
        }
      })
      publisher.send(buffer)
    })
  })

  it('Publisher.call() sends a COMPLEX object, Subscriber.consume() sends it back and Publisher receives it intact', (done) => {
    setupConnections().then(() => {
      let buffer = Buffer.from('test content')
      let object = {
        foo: 'bar',
        bar: {
          baz: true,
          arr: [0, 1, 2, 3],
          buff: buffer
        }
      }
      subscriber.consume((msg) => {
        if (
          !msg || typeof msg !== 'object' ||
          msg.foo !== 'bar' ||
          !msg.bar ||
          msg.bar.baz !== true ||
          !Array.isArray(msg.bar.arr) ||
          msg.bar.arr.length !== 4 ||
          msg.bar.arr[0] !== 0 || msg.bar.arr[1] !== 1 || msg.bar.arr[2] !== 2 || msg.bar.arr[3] !== 3 ||
          !Buffer.isBuffer(msg.bar.buff) || msg.bar.buff.toString('base64') !== buffer.toString('base64') || buffer.toString('utf8') !== 'test content'
        ) {
          done(new Error('Object sent and received are not equal'))
        } else {
          done()
        }
      })
      publisher.send(object)
    })
  })

  it('Publisher.send() throws an error when the parameter is not json-serializeable', (done) => {
    setupConnections().then(() => {
      let nonJSONSerializableMessage = {}
      nonJSONSerializableMessage.a = {b: nonJSONSerializableMessage}

      subscriber.consume((msg) => {
        done(new Error('Should not receive the message'))
      })

      publisher.send(nonJSONSerializableMessage)
        .then(() => done('Did not throw an error'))
        .catch(() => done())
    })
  })

  // The "+ 1" in the line below is the first try (which is not a "re"-try)
  it(`QueueServer.consume() tries to receive message for ${maxRetry + 1} times`, (done) => {
    setupConnections().then(() => {
      let consumeCalled = 0
      let objectMessage = {foo: 'bar', bar: 'foo'}

      subscriber.consume((msg) => {
        consumeCalled++
        if (consumeCalled > maxRetry + 1) {
          done(new Error(`Retried more times than limit: ${maxRetry}`))
          return
        }
        throw new Error('message not processed well')
      })

      publisher.send(objectMessage)

      setTimeout(() => {
        assert.equal(consumeCalled, maxRetry + 1, '')
        done()
      }, 1000)
    })
  })

  it('Publisher.send() sends a message and each subscriber receives it', (done) => {
    let otherSubscriber
    setupConnections().then(() => {
      let otherSubscriberConnection = new QueueConnection(config)
      otherSubscriberConnection.setLogger(logger)
      return otherSubscriberConnection.connect()
    }).then(() => {
      otherSubscriber = new Subscriber(subscriberConnection, logger, publisherName, {maxRetry, timeoutMs: 10000})
      return otherSubscriber.initialize()
    }).then(() => {
      let stringMessage = 'foobar'

      let ack1 = false
      let ack2 = false

      subscriber.consume((msg) => {
        if (msg !== stringMessage) {
          done(new Error('String received is not the same as the String sent'))
          return
        }
        if (ack2) {
          done()
        }
        ack1 = true
      })

      otherSubscriber.consume((msg) => {
        if (msg !== stringMessage) {
          done(new Error('String received is not the same as the String sent'))
          return
        }
        if (ack1) {
          done()
        }
        ack2 = true
      })

      publisher.send(stringMessage)
    })
  })
})
