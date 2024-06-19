import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import QueueManager from '../src/QueueManager.js'
import ConsoleInspector from './consoleInspector.js'
import config from './config/LoadConfig.js'

describe('GatheringClient && GatheringServer actions', () => {
  const gatheringName = 'techteamer-mq-js-test-test-gathering-action'
  const logger = new ConsoleInspector(console)
  const timeoutMs = 1000
  const assertExchangeOptions = { durable: false, autoDelete: true }

  const queueManager = new QueueManager(config)
  queueManager.setLogger(logger)

  const gatheringClient = queueManager.getGatheringClient(gatheringName, { queueMaxSize: 100, timeoutMs, assertExchangeOptions })
  const gatheringServer1 = queueManager.getGatheringServer(gatheringName, { prefetchCount: 1, timeoutMs, assertExchangeOptions })

  beforeAll(() => {
    return queueManager.connect()
  })

  afterAll(() => {
    logger.empty()
  })

  it('GatheringServer.registerAction() registers the action, GatheringClient.callAction() sends a STRING and the registered callback for the action receives it', () => new Promise((resolve) => {
    const stringMessage = 'foobar'

    gatheringServer1.registerAction('compareString', (msg) => {
      if (msg === stringMessage) {
        resolve()
      } else {
        resolve(new Error(`The compared String is not equal to the String that was sent ${msg}`))
      }
    })

    gatheringClient.requestAction('compareString', stringMessage, 1000).catch((err) => {
      resolve(err)
    })
  }))

  it('GatheringServer handles unserializeable content', () => new Promise((resolve) => {
    gatheringServer1.registerAction('wrongtest1', () => {
      resolve(new Error('GatheringServer Action should not be called'))
    })

    const obj = {}
    obj.a = { b: obj }

    gatheringClient.requestAction('wrongtest1', obj, 1000).then(() => {
      resolve('GatheringServer successfully sent unsendable data')
    }).catch((err) => {
      expect(err).to.be.an.instanceof(Error)
      resolve()
    })
  }))

  it('GatheringServer responds with not found when no action handler is registered', () => new Promise((resolve) => {
    gatheringClient.requestAction('notfound', 'hello', 1000).then((response) => {
      if (typeof response === 'undefined') {
        resolve()
      } else {
        resolve(new Error('Response should have been undefined'))
      }
    }).catch((err) => {
      resolve(err)
    })
  }))
})
