const QueueManager = require('../src/QueueManager')
const ConsoleInspector = require('./consoleInspector')
let config = require('./config/LoadConfig')

describe('RPCClient && RPCServer', () => {
  let rpcName = 'test-rpc'
  let shortRpcName = 'short-test-rpc'
  const logger = new ConsoleInspector(console)
  let timeoutMs = 1000

  const queueManager = new QueueManager(config)
  queueManager.setLogger(logger)

  let rpcClient = queueManager.getRPCClient(rpcName, {queueMaxSize: 100, timeoutMs})
  let rpcServer = queueManager.getRPCServer(rpcName, {prefetchCount: 1, timeoutMs})
  let shortRpcClient = queueManager.getRPCClient(shortRpcName, {queueMaxSize: 1, timeoutMs})
  let shortRpcServer = queueManager.getRPCServer(shortRpcName, {prefetchCount: 1, timeoutMs})

  before(() => {
    return queueManager.connect()
  })

  after(() => {
    logger.empty()
  })

  it('RPCClient.call() sends a STRING and RPCServer.consume() receives it', (done) => {
    let stringMessage = 'foobar'
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
    let objectMessage = {foo: 'bar', bar: 'foo'}
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

  it('RPCClient.call() sends an OBJECT, RPCServer.consume() sends it back and RPCClient receives it intact', (done) => {
    let objectMessage = {foo: 'bar', bar: 'foo'}
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

  it('RPCClient.call() throws an error when the parameter cant be JSON-serialized', (done) => {
    let nonJSONSerializableMessage = {}
    nonJSONSerializableMessage.a = {b: nonJSONSerializableMessage}

    rpcServer.consume((msg) => {
      done(new Error('Should not receive the message'))
    })

    rpcClient.call(nonJSONSerializableMessage)
      .then(() => done(new Error('Did not throw an error')))
      .catch(() => done())
  })

  it(`RPCClient.call() throws an error if it doesn't receive a response sooner than ${timeoutMs}ms`, (done) => {
    let objectMessage = {foo: 'bar', bar: 'foo'}

    rpcServer.consume((msg) => {
      let now = Date.now()
      while (new Date().getTime() < now + timeoutMs + 100) { }
      return msg
    })

    rpcClient.call(objectMessage)
      .then(() => done(new Error('Did not throw a timeout error')))
      .catch(() => done())
  })

  it(`RPCClient frees up memory after timeout`, (done) => {
    let objectMessage = {foo: 'bar', bar: 'foo'}

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
})
