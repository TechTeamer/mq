const QueueManager = require('../src/QueueManager')
const ConsoleInspector = require('./consoleInspector')
let config = require('./config/LoadConfig')

describe('RPCClient && RPCServer', () => {
  let rpcName = 'test-rpc'
  const logger = new ConsoleInspector(console)
  let timeoutMs = 1000

  const clientManager = new QueueManager(config)
  clientManager.setLogger(logger)
  let rpcClient = clientManager.getRPCClient(rpcName, {queueMaxSize: 100, timeoutMs})

  const serverManager = new QueueManager(config)
  serverManager.setLogger(logger)
  let rpcServer = clientManager.getRPCServer(rpcName, {prefetchCount: 1, timeoutMs})

  before(() => {
    return clientManager.connect().then(() => {
      return serverManager.connect()
    })
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
      .then(() => done('Did not throw an error'))
      .catch(() => done())
  })

  it(`RPCClient.call() throws an error if it doesn't receive a response sooner than ${timeoutMs}ms`, (done) => {
    let objectMessage = {foo: 'bar', bar: 'foo'}

    rpcServer.consume((msg) => {
      let now = new Date().getTime()
      while (new Date().getTime() < now + timeoutMs + 100) { }
      return msg
    })

    rpcClient.call(objectMessage)
      .then(() => done('Did not throw an error'))
      .catch(() => done())
  })
})
