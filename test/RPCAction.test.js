const QueueManager = require('../src/QueueManager')
const ConsoleInspector = require('./consoleInspector')
const config = require('./config/LoadConfig')
const chai = require('chai')
const expect = chai.expect

describe('RPCClient && RPCServer actions', function () {
  const rpcName = 'techteamer-mq-js-test-rpc-action'
  const logger = new ConsoleInspector(console)
  const timeoutMs = 1000
  const assertQueueOptions = { durable: false, exclusive: true }

  const queueManager = new QueueManager(config)
  queueManager.setLogger(logger)

  const rpcClient = queueManager.getRPCClient(rpcName, { queueMaxSize: 100, timeoutMs })
  const rpcServer = queueManager.getRPCServer(rpcName, { prefetchCount: 1, timeoutMs, assertQueue: assertQueueOptions })

  before(() => {
    return queueManager.connect()
  })

  after(() => {
    logger.empty()
  })

  it('RPCServer.registerAction() registers the action, RPCClient.callAction() sends a STRING and the registered callback for the action receives it', (done) => {
    const stringMessage = 'foobar'

    rpcServer.registerAction('compareString', (msg) => {
      if (msg === stringMessage) {
        done()
      } else {
        done(new Error('The compared String is not equal to the String that was sent'))
      }
    })

    rpcClient.callAction('compareString', stringMessage, 1000).catch((err) => {
      done(err)
    })
  })

  it('RPCClient handles unserializeable content', (done) => {
    rpcServer.registerAction('wrongtest1', (msg) => {
      done(new Error('RPCServer Action should not be called'))
    })

    const obj = {}
    obj.a = { b: obj }

    rpcClient.callAction('wrongtest1', obj, 1000).then(() => {
      done('RPCClient successfully sent unsendable data')
    }).catch((err) => {
      expect(err).to.be.an.instanceof(Error)
      done()
    })
  })

  it('RPCServer handles unserializeable content', (done) => {
    rpcServer.registerAction('wrongtest2', (msg) => {
      const obj = {}
      obj.a = { b: obj }

      return obj
    })

    rpcClient.callAction('wrongtest2', 'hello', 1000).then(() => {
      done('RPCServer successfully sent unsendable data')
    }).catch((err) => {
      expect(err).to.be.an.instanceof(Error)
      done()
    })
  })
})
