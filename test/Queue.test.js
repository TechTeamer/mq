import { describe, it, assert, beforeAll, afterAll } from 'vitest'
import QueueManager from '../src/QueueManager.js'
import ConsoleInspector from './consoleInspector.js'
import SeedRandom from 'seed-random'
import config from './config/LoadConfig.js'

describe('QueueClient && QueueServer', () => {
  const queueName = 'techteamer-mq-js-test-queue'
  const logger = new ConsoleInspector(console)
  const maxRetry = 5
  const assertQueueOptions = { durable: false, exclusive: true, autoDelete: true }

  const clientManager = new QueueManager(config)
  clientManager.setLogger(logger)
  const queueClient = clientManager.getQueueClient(queueName, {
    assertQueue: false // skip queue assertion for client, b/c the server initiates it exclusively
  })

  const serverManager = new QueueManager(config)
  serverManager.setLogger(logger)
  const options = {
    prefetchCount: 1,
    maxRetry,
    timeoutMs: 10000,
    assertQueue: true,
    assertQueueOptions
  }
  const queueServer = serverManager.getQueueServer(queueName, options)

  beforeAll(() => {
    return clientManager.connect().then(() => {
      return serverManager.connect()
    })
  })

  afterAll(() => {
    logger.empty()
  })

  it('QueueClient.send() sends a STRING and QueueServer.consume() receives it', new Promise((resolve) => {
    const stringMessage = 'foobar'
    queueServer.consume((msg) => {
      if (msg !== stringMessage) {
        resolve(new Error('String received is not the same as the String sent'))
        return
      }

      resolve()
    })
    queueClient.send(stringMessage).catch((err) => {
      resolve(err)
    })
  }))

  it('QueueClient.send() sends an OBJECT and QueueServer.consume() receives it', new Promise((resolve) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }
    queueServer.consume((msg) => {
      if (JSON.stringify(msg) !== JSON.stringify(objectMessage)) {
        resolve(new Error('The send OBJECT is not equal to the received one'))
        return
      }
      resolve()
    })
    queueClient.send(objectMessage).catch((err) => {
      resolve(err)
    })
  }))

  it('QueueClient.send() throws an error when the parameter is not json-serializeable', new Promise((resolve) => {
    const nonJSONSerializableMessage = {}
    nonJSONSerializableMessage.a = { b: nonJSONSerializableMessage }

    queueServer.consume((msg) => {
      resolve(new Error('Should not receive the message'))
    })

    queueClient.send(nonJSONSerializableMessage)
      .then(() => resolve(new Error('Sending a non-json-serializeable object did not throw an error')))
      .catch(() => resolve())
  }))

  it('QueueClient.send() sends a message with a 100MB random generated buffer and QueueServer.consume() receives it', new Promise((resolve) => {
    const stringMessage = 'foobar'
    const attachments = new Map()

    const rand = SeedRandom()
    const buf = Buffer.alloc(102400)

    for (let i = 0; i < 102400; ++i) {
      buf[i] = (rand() * 255) << 0
    }

    attachments.set('test', buf)

    queueServer.consume((msg, msgProp, queueMessage) => {
      if (queueMessage.getAttachments().get('test').toString() !== buf.toString()) {
        resolve(new Error('String received is not the same as the String sent'))
        return
      }
      resolve()
    })

    queueClient.send(stringMessage, null, null, attachments).catch((err) => {
      resolve(err)
    })
  }))

  it(`QueueServer.consume() tries to receive message for ${maxRetry + 1} times`, new Promise((resolve) => {
    let consumeCalled = 0
    const objectMessage = { foo: 'bar', bar: 'foo' }

    queueServer.consume((msg) => {
      consumeCalled++
      if (consumeCalled > maxRetry + 1) {
        resolve(new Error(`Tried more times than limit: ${maxRetry}`))
        return
      }
      throw new Error('message not processed well')
    })

    queueClient.send(objectMessage).catch((err) => {
      resolve(err)
    })

    setTimeout(() => {
      assert.strictEqual(consumeCalled, maxRetry + 1, '')
      resolve()
    }, 1000)
  }))
})
