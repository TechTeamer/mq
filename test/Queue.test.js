const assert = require('assert')
const QueueClient = require('../src/QueueClient')
const QueueServer = require('../src/QueueServer')
const QueueConnection = require('../src/QueueConnection')
const ConsoleInspector = require('./consoleInspector')
let config = require('./config/LoadConfig')

describe('QueueClient && QueueServer', () => {
  let queueName = 'test-queue'
  const logger = new ConsoleInspector(console)
  let maxRetry = 5

  let clientConnection = new QueueConnection(config)
  clientConnection.setLogger(logger)
  let queueClient = new QueueClient(clientConnection, logger, queueName)

  let serverConnection = new QueueConnection(config)
  serverConnection.setLogger(logger)
  let options = {prefetchCount: 1, maxRetry, timeoutMs: 10000}
  let queueServer = new QueueServer(serverConnection, logger, queueName, options)

  let initialized = false
  const setupConnections = () => {
    if (initialized) {
      return Promise.resolve()
    }

    initialized = true
    return queueServer.initialize()
  }

  after(() => {
    logger.printLogs()
    logger.empty()
  })

  it('QueueClient.send() sends a STRING and QueueServer.consume() receives it', (done) => {
    setupConnections().then(() => {
      let stringMessage = 'foobar'
      queueServer.consume((msg) => {
        if (msg !== stringMessage) {
          done(new Error('String received is not the same as the String sent'))
          return
        }

        done()
      })
      queueClient.send(stringMessage)
    })
  })

  it('QueueClient.send() sends an OBJECT and QueueServer.consume() receives it', (done) => {
    setupConnections().then(() => {
      let objectMessage = {foo: 'bar', bar: 'foo'}
      queueServer.consume((msg) => {
        if (JSON.stringify(msg) !== JSON.stringify(objectMessage)) {
          done(new Error('The send OBJECT is not equal to the received one'))
          return
        }
        done()
      })
      queueClient.send(objectMessage)
    })
  })

  it('QueueClient.send() sends a BUFFER, QueueServer.consume() sends it back and QueueClient receives it intact', (done) => {
    setupConnections().then(() => {
      let buffer = Buffer.from('test content')
      queueServer.consume((msg) => {
        if (Buffer.isBuffer(msg) && msg.toString('base64') === buffer.toString('base64') && buffer.toString('utf8') === 'test content') {
          done()
        } else {
          done(new Error('Object sent and received are not equal'))
        }
      })
      queueClient.send(buffer)
    })
  })

  it('QueueClient.call() sends a COMPLEX object, QueueServer.consume() sends it back and QueueClient receives it intact', (done) => {
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
      queueServer.consume((msg) => {
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
      queueClient.send(object)
    })
  })

  it('QueueClient.send() throws an error when the parameter is not json-serializeable', (done) => {
    setupConnections().then(() => {
      let nonJSONSerializableMessage = {}
      nonJSONSerializableMessage.a = {b: nonJSONSerializableMessage}

      queueServer.consume((msg) => {
        done(new Error('Should not receive the message'))
      })

      queueClient.send(nonJSONSerializableMessage)
        .then(() => done(new Error('Sending a non-json-serializeable object did not throw an error')))
        .catch(() => done())
    })
  })

  it(`QueueServer.consume() tries to receive message for ${maxRetry + 1} times`, (done) => {
    setupConnections().then(() => {
      let consumeCalled = 0
      let objectMessage = {foo: 'bar', bar: 'foo'}

      queueServer.consume((msg) => {
        consumeCalled++
        if (consumeCalled > maxRetry + 1) {
          done(new Error(`Tried more times than limit: ${maxRetry}`))
          return
        }
        throw new Error('message not processed well')
      })

      queueClient.send(objectMessage)

      setTimeout(() => {
        assert.equal(consumeCalled, maxRetry + 1, '')
        done()
      }, 1000)
    })
  })
})
