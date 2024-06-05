import { describe, it, beforeAll, afterAll } from 'vitest'
import QueueManager from '../src/QueueManager.js'
import ConsoleInspector from './consoleInspector.js'
import SeedRandom from 'seed-random'
import config from './config/LoadConfig.js'

describe('GatheringClient && GatheringServer', () => {
  const gatheringName = 'techteamer-mq-js-test-gathering'
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

  it('GatheringClient.request() sends a STRING and GatheringServer.consume() receives it', () => new Promise((resolve) => {
    const stringMessage = 'foobar'
    gatheringServer1.consume((msg) => {
      if (msg === stringMessage) {
        resolve()
      } else {
        resolve(new Error('String received is not the same as the String sent'))
      }
      return true
    })
    gatheringClient.request(stringMessage, 10000).catch((err) => {
      resolve(err)
    })
  }))

  it('GatheringClient.request() sends an OBJECT and GatheringServer.consume() receives it', () => new Promise((resolve) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }
    gatheringServer1.consume((msg) => {
      if (JSON.stringify(msg) === JSON.stringify(objectMessage)) {
        resolve()
      } else {
        resolve(new Error('The send OBJECT is not equal to the received one'))
      }
      return true
    })
    gatheringClient.request(objectMessage, 10000).catch((err) => {
      resolve(err)
    })
  }))

  it('GatheringClient.request() sends an OBJECT, GatheringServer.consume() sends it back and GatheringClient receives it intact', () => new Promise((resolve) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }
    gatheringServer1.consume((msg) => {
      return msg
    })
    gatheringClient.request(objectMessage, 10000).then((res) => {
      if (JSON.stringify(res) === JSON.stringify(objectMessage)) {
        resolve()
      } else {
        resolve(new Error(`Object sent and received are not equal: ${JSON.stringify(res)}`))
      }
    }).catch((err) => {
      resolve(err)
    })
  }))

  it('GatheringClient.request() sends an OBJECT, GatheringServer.consume() sends back a response' +
    'with a 100MB random generated buffer and GatheringClient receives it', () => async (resolve) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }

    const rand = SeedRandom()
    const buf = Buffer.alloc(102400)
    for (let i = 0; i < 102400; ++i) {
      buf[i] = (rand() * 255) << 0
    }

    gatheringServer1.consume((msg, request, response) => {
      response.addAttachment('test', buf)
      if (!response.hasAnyAttachments()) {
        resolve(new Error('Missing attachment from response'))
      }
      if (!response.hasAttachment('test')) {
        resolve(new Error('Missing attachment name "test" from response'))
      }
      if (response.getAttachment('test') !== buf) {
        resolve(new Error('Attachment name "test" is not the same'))
      }
      return msg
    })
    gatheringClient.request(objectMessage, 10000, null, true).then((res) => {
      if (!res.hasAttachment('test')) {
        resolve(new Error('Missing attachment from reply'))
      } else if (!(res.getAttachment('test') instanceof Buffer)) {
        resolve(new Error('Attachment is not a buffer'))
      } else if (res.getAttachment('test').toString() !== buf.toString()) {
        resolve(new Error('String received is not the same as the String sent'))
      } else {
        resolve()
      }
    }).catch((err) => {
      resolve(err)
    })
  })

  it('gatheringClient.request() sends a message with a 100MB random generated buffer and gatheringServer1.consume() receives it', () => new Promise((resolve) => {
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
        resolve(new Error('String received is not the same as the String sent'))
        return
      }
      resolve()
    })

    gatheringClient.request(stringMessage, null, attachments).catch((err) => {
      resolve(err)
    })
  }))

  it('GatheringClient.request() throws an error when the parameter cant be JSON-serialized', () => new Promise((resolve) => {
    const nonJSONSerializableMessage = {}
    nonJSONSerializableMessage.a = { b: nonJSONSerializableMessage }

    gatheringServer1.consume((msg) => {
      resolve(new Error('Should not receive the message'))
      return true
    })

    gatheringClient.request(nonJSONSerializableMessage)
      .then(() => resolve(new Error('Did not throw an error')))
      .catch(() => resolve())
  }))

  it(`GatheringClient.request() throws an error if it doesn't receive a response sooner than ${timeoutMs}ms`, () => new Promise((resolve) => {
    const objectMessage = { foo: 'bar', bar: 'foo' }

    gatheringServer1.consume(async (msg) => {
      await new Promise((res) => setTimeout(res, timeoutMs + 100))
      return msg
    })

    gatheringClient.request(objectMessage)
      .then(() => resolve(new Error('Did not throw a timeout error')))
      .catch(() => resolve())
  }))

  it('gatheringClient.request() rejects when a consumer sets an error status', () => new Promise((resolve) => {
    const messageBody = 'hello'
    gatheringServer1.consume((msg, message, response) => {
      // undefined is implied not found
      response.setStatus(response.ERROR, 'HELLO_ERROR')
    })

    gatheringClient.request(messageBody, 10000, null, false, false).then(() => {
      resolve(new Error('Should have rejected'))
    }).catch((err) => {
      if (err.message === 'HELLO_ERROR') {
        resolve()
      } else {
        resolve(new Error(err.message))
      }
    })
  }))

  it('gatheringClient.request() rejects when a consumer sends malformed message', () => new Promise((resolve) => {
    const messageBody = 'hello'
    gatheringServer1.consume(() => {
      // undefined is implied not found
      const obj = {}
      obj.a = { b: obj }
      return obj
    })

    gatheringClient.request(messageBody, 10000, null, false, false).then(() => {
      resolve(new Error('Should have rejected'))
    }).catch((err) => {
      if (err.message === 'failed to construct reply') {
        resolve()
      } else {
        resolve(new Error(err.message))
      }
    })
  }))

  it('gatheringClient.request() rejects when a consumer throws an error', () => new Promise((resolve) => {
    const messageBody = 'hello'
    gatheringServer1.consume(() => {
      // undefined is implied not found
      throw new Error('HELLO_ERROR')
    })

    gatheringClient.request(messageBody, 10000, null, false, false).then(() => {
      resolve(new Error('Should reject when one of the consumers reject'))
    }).catch((err) => {
      if (err.message === 'response failed') {
        resolve()
      } else {
        resolve(new Error(err.message))
      }
    })
  }))
})
