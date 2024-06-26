import { describe, it, beforeAll, afterAll } from 'vitest'
import QueueManager from '../src/QueueManager.js'
import ConsoleInspector from './consoleInspector.js'
import config from './config/LoadConfig.js'

describe('Publisher && Subscriber actions', () => {
  const publisherName = 'techteamer-mq-js-test-publisher-action'
  const logger = new ConsoleInspector(console)
  const maxRetry = 5
  const assertExchangeOptions = { durable: false, autoDelete: true }

  const publisherManager = new QueueManager(config)
  publisherManager.setLogger(logger)
  const publisher = publisherManager.getPublisher(publisherName, {
    assertExchangeOptions
  })

  const subscriberManager = new QueueManager(config)
  subscriberManager.setLogger(logger)
  const subscriber = subscriberManager.getSubscriber(publisherName, {
    maxRetry,
    timeoutMs: 10000,
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

  it('subscriber.registerAction() registers the action, publisher.callAction() sends a STRING and the registered callback for the action receives it', () => new Promise((resolve) => {
    const stringMessage = 'foobar'

    subscriber.registerAction('compareString', (msg) => {
      if (msg === stringMessage) {
        resolve()
      } else {
        resolve(new Error('The compared String is not equal to the String that was sent'))
      }
    })

    publisher.sendAction('compareString', stringMessage).catch((err) => {
      resolve(err)
    })
  }))
})
