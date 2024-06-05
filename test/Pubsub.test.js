import { describe, assert, it, beforeAll, afterAll } from 'vitest'
import QueueManager from '../src/QueueManager.js'
import ConsoleInspector from './consoleInspector.js'
import SeedRandom from 'seed-random'
import config from './config/LoadConfig.js'

describe('Publisher && Subscriber', () => {
  const publisherName = 'techteamer-mq-js-test-publisher'
  const logger = new ConsoleInspector(console)
  const maxRetry = 5
  const assertExchangeOptions = { durable: false, autoDelete: true }

  const publisherManager = new QueueManager(config)
  publisherManager.setLogger(logger)
  const publisher = publisherManager.getPublisher(publisherName, {
    assertExchange: true,
    assertExchangeOptions
  })

  const subscriberManager = new QueueManager(config)
  subscriberManager.setLogger(logger)
  const subscriber = subscriberManager.getSubscriber(publisherName, {
    maxRetry,
    timeoutMs: 10000,
    assertExchange: true,
    assertExchangeOptions
  })

  beforeAll(() => {
    return publisherManager.connect().then(() => {
      return subscriberManager.connect()
    })
  })

  afterAll(() => {
    logger.empty()
  })

  it('Publisher.send() sends a STRING and Subscriber.consume() receives it', () => new Promise((resolve) => {
    const stringMessage = 'foobar'

    subscriber.consume((msg) => {
      if (msg !== stringMessage) {
        resolve(new Error('String received is not the same as the String sent'))
        return
      }
      resolve()
    })

    publisher.send(stringMessage).catch((err) => {
      resolve(err)
    })
  }))

  it('Publisher.send() sends an OBJECT and Subscriber.consume() receives it', () => new Promise((resolve) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }

    subscriber.consume((msg) => {
      if (JSON.stringify(msg) !== JSON.stringify(objectMessage)) {
        resolve(new Error('The send OBJECT is not equal to the received one'))
        return
      }
      resolve()
    })

    publisher.send(objectMessage).catch((err) => {
      resolve(err)
    })
  }))

  it('Publisher.send() sends a message with a 100MB random generated buffer and Subscriber.consume() receives it', () => new Promise((resolve) => {
    const stringMessage = 'foobar'
    const attachments = new Map()

    const rand = SeedRandom()
    const buf = Buffer.alloc(102400)

    for (let i = 0; i < 102400; ++i) {
      buf[i] = (rand() * 255) << 0
    }

    attachments.set('test', buf)

    subscriber.consume((msg, msgProp, queueMessage) => {
      if (queueMessage.getAttachments().get('test').toString() !== buf.toString()) {
        resolve(new Error('String received is not the same as the String sent'))
        return
      }
      resolve()
    })

    publisher.send(stringMessage, null, null, attachments).catch((err) => {
      resolve(err)
    })
  }))

  it('Publisher.send() throws an error when the parameter is not json-serializeable', () => new Promise((resolve) => {
    const nonJSONSerializableMessage = {}
    nonJSONSerializableMessage.a = { b: nonJSONSerializableMessage }

    subscriber.consume((msg) => {
      resolve(new Error('Should not receive the message'))
    })

    publisher.send(nonJSONSerializableMessage)
      .then(() => resolve('Did not throw an error'))
      .catch(() => resolve())
  }))

  // The "+ 1" in the line below is the first try (which is not a "re"-try)
  it(`QueueServer.consume() tries to receive message for ${maxRetry + 1} times`, () => new Promise((resolve) => {
    let consumeCalled = 0
    const objectMessage = { foo: 'bar', bar: 'foo' }

    subscriber.consume((msg) => {
      consumeCalled++
      if (consumeCalled > maxRetry + 1) {
        resolve(new Error(`Retried more times than limit: ${maxRetry}`))
        return
      }
      throw new Error('message not processed well')
    })

    publisher.send(objectMessage).catch((err) => {
      resolve(err)
    })

    setTimeout(() => {
      assert.strictEqual(consumeCalled, maxRetry + 1, '')
      resolve()
    }, 1000)
  }))

  it('Publisher.send() sends a message and each subscriber receives it', () => new Promise((resolve) => {
    const otherManager = new QueueManager(config)
    otherManager.setLogger(logger)
    const otherSubscriber = otherManager.getSubscriber(publisherName, {
      maxRetry,
      timeoutMs: 10000,
      assertExchange: assertExchangeOptions
    })

    otherManager.connect().then(() => {
      const stringMessage = 'foobar'

      let ack1 = false
      let ack2 = false

      subscriber.consume((msg) => {
        if (msg !== stringMessage) {
          resolve(new Error('String received is not the same as the String sent'))
          return
        }
        if (ack2) {
          resolve()
        }
        ack1 = true
      })

      otherSubscriber.consume((msg) => {
        if (msg !== stringMessage) {
          resolve(new Error('String received is not the same as the String sent'))
          return
        }
        if (ack1) {
          resolve()
        }
        ack2 = true
      })

      publisher.send(stringMessage).catch((err) => {
        resolve(err)
      })
    }).catch((err) => {
      resolve(err)
    })
  }))
})
