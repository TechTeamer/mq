const assert = require('assert')
const QueueManager = require('../src/QueueManager')
const ConsoleInspector = require('./consoleInspector')
let config = require('./config/LoadConfig')

describe('Publisher && Subscriber', () => {
  let publisherName = 'test-publisher'
  const logger = new ConsoleInspector(console)
  let maxRetry = 5

  let publisherManager = new QueueManager(config)
  publisherManager.setLogger(logger)
  let publisher = publisherManager.getPublisher(publisherName)

  let subscriberManager = new QueueManager(config)
  subscriberManager.setLogger(logger)
  let subscriber = subscriberManager.getSubscriber(publisherName, { maxRetry, timeoutMs: 10000 })

  before(() => {
    return publisherManager.connect().then(() => {
      return subscriberManager.connect()
    })
  })

  after(() => {
    logger.empty()
  })

  it('Publisher.send() sends a STRING and Subscriber.consume() receives it', (done) => {
    let stringMessage = 'foobar'

    subscriber.consume((msg) => {
      if (msg !== stringMessage) {
        done(new Error('String received is not the same as the String sent'))
        return
      }
      done()
    })

    publisher.send(stringMessage).catch((err) => {
      done(err)
    })
  })

  it('Publisher.send() sends an OBJECT and Subscriber.consume() receives it', (done) => {
    let objectMessage = { foo: 'bar', bar: 'foo' }

    subscriber.consume((msg) => {
      if (JSON.stringify(msg) !== JSON.stringify(objectMessage)) {
        done(new Error('The send OBJECT is not equal to the received one'))
        return
      }
      done()
    })

    publisher.send(objectMessage).catch((err) => {
      done(err)
    })
  })

  it('Publisher.send() throws an error when the parameter is not json-serializeable', (done) => {
    let nonJSONSerializableMessage = {}
    nonJSONSerializableMessage.a = { b: nonJSONSerializableMessage }

    subscriber.consume((msg) => {
      done(new Error('Should not receive the message'))
    })

    publisher.send(nonJSONSerializableMessage)
      .then(() => done('Did not throw an error'))
      .catch(() => done())
  })

  // The "+ 1" in the line below is the first try (which is not a "re"-try)
  it(`QueueServer.consume() tries to receive message for ${maxRetry + 1} times`, (done) => {
    let consumeCalled = 0
    let objectMessage = { foo: 'bar', bar: 'foo' }

    subscriber.consume((msg) => {
      consumeCalled++
      if (consumeCalled > maxRetry + 1) {
        done(new Error(`Retried more times than limit: ${maxRetry}`))
        return
      }
      throw new Error('message not processed well')
    })

    publisher.send(objectMessage).catch((err) => {
      done(err)
    })

    setTimeout(() => {
      assert.strictEqual(consumeCalled, maxRetry + 1, '')
      done()
    }, 1000)
  })

  it('Publisher.send() sends a message and each subscriber receives it', (done) => {
    let otherManager = new QueueManager(config)
    otherManager.setLogger(logger)
    let otherSubscriber = otherManager.getSubscriber(publisherName, { maxRetry, timeoutMs: 10000 })

    otherManager.connect().then(() => {
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

      publisher.send(stringMessage).catch((err) => {
        done(err)
      })
    }).catch((err) => {
      done(err)
    })
  })
})
