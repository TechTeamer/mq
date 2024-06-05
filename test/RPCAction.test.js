import { describe, afterAll, beforeAll, it, assert, expect } from 'vitest'
import QueueManager from '../src/QueueManager.js'
import ConsoleInspector from './consoleInspector.js'
import config from './config/LoadConfig.js'

describe('RPCClient && RPCServer actions', function () {
  const rpcName = 'techteamer-mq-js-test-rpc-action'
  const logger = new ConsoleInspector(console)
  const timeoutMs = 1000
  const assertQueueOptions = { durable: false, exclusive: true, autoDelete: true }

  const queueManager = new QueueManager(config)
  queueManager.setLogger(logger)

  const rpcClient = queueManager.getRPCClient(rpcName, { queueMaxSize: 100, timeoutMs })
  const rpcServer = queueManager.getRPCServer(rpcName, { prefetchCount: 1, timeoutMs, assertQueueOptions })

  beforeAll(() => {
    return queueManager.connect()
  })

  afterAll(() => {
    logger.empty()
  })

  it('RPCServer.registerAction() registers the action, RPCClient.callAction() sends a STRING and the registered callback for the action receives it', new Promise((resolve) => {
    const stringMessage = 'foobar'

    rpcServer.registerAction('compareString', (msg) => {
      if (msg === stringMessage) {
        resolve()
      } else {
        resolve(new Error('The compared String is not equal to the String that was sent'))
      }
    })

    rpcClient.callAction('compareString', stringMessage, 1000).catch((err) => {
      resolve(err)
    })
  }))

  it('RPCClient handles unserializeable content', new Promise((resolve) => {
    rpcServer.registerAction('wrongtest1', () => {
      resolve(new Error('RPCServer Action should not be called'))
    })

    const obj = {}
    obj.a = { b: obj }

    rpcClient.callAction('wrongtest1', obj, 1000).then(() => {
      resolve('RPCClient successfully sent unsendable data')
    }).catch((err) => {
      expect(err).to.be.an.instanceof(Error)
      resolve()
    })
  }))

  it('RPCServer handles unserializeable content', new Promise((resolve) => {
    rpcServer.registerAction('wrongtest2', () => {
      const obj = {}
      obj.a = { b: obj }

      return obj
    })

    rpcClient.callAction('wrongtest2', 'hello', 1000).then(() => {
      resolve('RPCServer successfully sent unsendable data')
    }).catch((err) => {
      expect(err).to.be.an.instanceof(Error)
      resolve()
    })
  }))

  it('RPCServer registerAction throws when handler is not a function', () => {
    assert.throws(() => {
      rpcServer.registerAction('wrong-action', 'not-a-function')
    })
  })

  it('RPCServer registerAction throws when handler is already registered', () => {
    const handler1 = () => {
      // Do something...
    }
    const handler2 = () => {
      // Do something else...
    }

    rpcServer.registerAction('some-action', handler1)
    rpcServer.registerAction('some-action', handler2) // logs warning and ignores handler2

    assert.equal(rpcServer.actions.get('some-action'), handler1)
    assert.notEqual(rpcServer.actions.get('some-action'), handler2)
  })
})
