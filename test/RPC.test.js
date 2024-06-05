import QueueManager from '../src/QueueManager.js'
import ConsoleInspector from './consoleInspector.js'
import SeedRandom from 'seed-random'
import config from './config/LoadConfig.js'
import chai from 'chai'
import { v4 as uuid } from 'uuid'

const assert = chai.assert

describe('RPCClient && RPCServer', () => {
  const rpcName = 'techteamer-mq-js-test-rpc'
  const rpcExchangeName = 'techteamer-mq-js-test-rpc-exchange'
  const shortRpcName = 'techteamer-mq-js-test-rpc-short'
  const logger = new ConsoleInspector(console)
  const timeoutMs = 1000
  const assertQueueOptions = { durable: false, exclusive: true, autoDelete: true }

  const exchangeName = 'test-exchange'
  const exchangeOptions = { durable: false, autoDelete: true }

  const queueManager = new QueueManager(config)
  queueManager.setLogger(logger)

  const rpcClient = queueManager.getRPCClient(rpcName, { queueMaxSize: 100, timeoutMs })
  const rpcServer = queueManager.getRPCServer(rpcName, { prefetchCount: 1, timeoutMs, assertQueueOptions })

  const rpcExchangeClient = queueManager.getRPCClient(rpcExchangeName, { queueMaxSize: 100, timeoutMs, bindDirectExchangeName: exchangeName, exchangeOptions })
  const rpcExchangeServer = queueManager.getRPCServer(rpcExchangeName, { prefetchCount: 1, timeoutMs, assertQueueOptions, bindDirectExchangeName: exchangeName, exchangeOptions })

  const shortRpcClient = queueManager.getRPCClient(shortRpcName, { queueMaxSize: 1, timeoutMs })
  const shortRpcServer = queueManager.getRPCServer(shortRpcName, { prefetchCount: 1, timeoutMs, assertQueueOptions })

  before(() => {
    return queueManager.connect()
  })

  after(() => {
    logger.empty()
  })

  it('RPCClient.call() sends a STRING and RPCServer.consume() receives it', (done) => {
    const stringMessage = 'foobar'
    rpcServer.consume((msg) => {
      if (msg === stringMessage) {
        done()
      } else {
        done(new Error('String received is not the same as the String sent'))
      }
    })
    rpcClient.call(stringMessage, 10000).catch((err) => {
      done(err)
    })
  })

  it('RPCClient.call() sends an OBJECT and RPCServer.consume() receives it', (done) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }
    rpcServer.consume((msg) => {
      if (JSON.stringify(msg) === JSON.stringify(objectMessage)) {
        done()
      } else {
        done(new Error('The send OBJECT is not equal to the received one'))
      }
    })
    rpcClient.call(objectMessage, 10000).catch((err) => {
      done(err)
    })
  })

  it('RPCClient.call() calls through an EXCHANGE and RPCServer answers back', (done) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }
    rpcExchangeServer.consume((msg) => {
      return msg
    })

    rpcExchangeClient.call(objectMessage, 10000).then((res) => {
      if (JSON.stringify(res) === JSON.stringify(objectMessage)) {
        done()
      } else {
        done(new Error('Object sent and received are not equal'))
      }
    }).catch((err) => {
      done(err)
    })
  })

  it('RPCClient.call() sends an OBJECT, RPCServer.consume() sends it back and RPCClient receives it intact', (done) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }
    rpcServer.consume((msg) => {
      return msg
    })
    rpcClient.call(objectMessage, 10000).then((res) => {
      if (JSON.stringify(res) === JSON.stringify(objectMessage)) {
        done()
      } else {
        done(new Error('Object sent and received are not equal'))
      }
    }).catch((err) => {
      done(err)
    })
  })

  it('RPCClient.call() sends an OBJECT, RPCServer.consume() sends back a response' +
    'with a 100MB random generated buffer and RPCClient receives it', (done) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }

    const rand = SeedRandom()
    const buf = Buffer.alloc(102400)
    for (let i = 0; i < 102400; ++i) {
      buf[i] = (rand() * 255) << 0
    }

    rpcServer.consume((msg, request, response) => {
      response.addAttachment('test', buf)
      if (!response.hasAnyAttachments()) {
        done(new Error('Missing attachment from response'))
      }
      if (!response.hasAttachment('test')) {
        done(new Error('Missing attachment name "test" from response'))
      }
      if (response.getAttachment('test') !== buf) {
        done(new Error('Attachment name "test" is not the same'))
      }
      return msg
    })
    rpcClient.call(objectMessage, 10000, null, true).then((res) => {
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

  it('rpcClient.call() sends a message with a 100MB random generated buffer and rpcServer.consume() receives it', function (done) {
    const stringMessage = 'foobar'
    const attachments = new Map()

    const rand = SeedRandom()
    const buf = Buffer.alloc(102400)

    for (let i = 0; i < 102400; ++i) {
      buf[i] = (rand() * 255) << 0
    }

    attachments.set('test', buf)

    rpcServer.consume((msg, queueMessage) => {
      if (queueMessage.getAttachments().get('test').toString() !== buf.toString()) {
        done(new Error('String received is not the same as the String sent'))
        return
      }
      done()
    })

    rpcClient.call(stringMessage, null, attachments).catch((err) => {
      done(err)
    })
  })

  it('RPCClient.call() throws an error when the parameter cant be JSON-serialized', (done) => {
    const nonJSONSerializableMessage = {}
    nonJSONSerializableMessage.a = { b: nonJSONSerializableMessage }

    rpcServer.consume(() => {
      done(new Error('Should not receive the message'))
    })

    rpcClient.call(nonJSONSerializableMessage)
      .then(() => done(new Error('Did not throw an error')))
      .catch(() => done())
  })

  it(`RPCClient.call() throws an error if it doesn't receive a response sooner than ${timeoutMs}ms`, (done) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }

    rpcServer.consume(async (msg) => {
      await new Promise((resolve) => setTimeout(resolve, timeoutMs + 100))
      return msg
    })

    rpcClient.call(objectMessage)
      .then(() => done(new Error('Did not throw a timeout error')))
      .catch(() => done())
  })

  it('RPCClient frees up memory after timeout', (done) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }

    let waitForTimeout = true
    shortRpcServer.consume(() => {
      if (waitForTimeout) {
        return new Promise(resolve => setTimeout(resolve, timeoutMs + 100))
      }
      return Promise.resolve()
    })

    shortRpcClient.call(objectMessage)
      .then(() => done(new Error('Did not throw a timeout error')))
      .catch(() => {
        waitForTimeout = false
        return shortRpcClient.call(objectMessage)
      })
      .then(() => done())
      .catch(err => done(err))
  })

  it('RPCServer handles errors and can continue to work after them', async () => {
    const objectMessage = { foo: 'bar', bar: 'foo' }
    const response = 'still working'
    let shouldFail = true
    rpcServer.consume(async () => {
      if (shouldFail) {
        shouldFail = false
        throw new Error('Failed to process message')
      }

      return response
    })

    try {
      await rpcClient.call(objectMessage)
      throw new Error('Should have thrown by now...')
    } catch (err) {
      assert.equal(err.message, 'RPCCLIENT: cannot make rpc call cannot answer')
    }

    try {
      const result = await rpcClient.call(objectMessage)
      assert.equal(result, response)
    } catch (err) {
      throw new Error('Should not fail!')
    }
  })

  it('RPCServer handles errors after timeout and can continue to work after them', async () => {
    const objectMessage = { foo: 'bar', bar: 'foo' }
    const response = 'still working'

    let shouldFail = true
    rpcServer.consume(async () => {
      if (shouldFail) {
        shouldFail = false
        await new Promise(resolve => setTimeout(resolve, timeoutMs + 100))
        throw new Error('Failed to process message')
      }

      return response
    })

    try {
      await rpcClient.call(objectMessage)
      throw new Error('Should have thrown by now...')
    } catch (err) {
      assert.equal(err.message, 'RPCCLIENT: cannot make rpc call Error: RPCCLIENT MESSAGE TIMEOUT techteamer-mq-js-test-rpc')
    }

    try {
      const result = await rpcClient.call(objectMessage)
      assert.equal(result, response)
    } catch (err) {
      throw new Error('Should not fail!')
    }
  })

  it('RPCServer should not process messages when request status is not \'ok\'', async () => {
    let called = false
    rpcServer.consume(() => {
      called = true
    })

    const options = Object.assign({ correlationId: uuid(), replyTo: rpcClient._replyQueue })
    const message = Buffer.from('{invalid string that could look like json')

    const channel = await rpcClient._connection.getChannel()
    channel.sendToQueue(rpcClient.name, message, options)

    await new Promise((resolve) => setTimeout(resolve, 1000))
    assert.equal(called, false)
  })
})
