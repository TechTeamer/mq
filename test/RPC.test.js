const RPCClient = require('../src/RPCClient')
const RPCServer = require('../src/RPCServer')
const QueueConnection = require('../src/QueueConnection')
const ConsoleInspector = require('./consoleInspector')
const logger = new ConsoleInspector(console)

describe('RPCClient && RPCServer', () => {
  let rpcName = 'test-rpc'
  const config = require('./fixtures/TestConfig')
  const clientConnection = new QueueConnection(config)
  const serverConnection = new QueueConnection(config)
  clientConnection.setLogger(logger)
  serverConnection.setLogger(logger)
  let rpcClient
  let rpcServer

  Promise.all([clientConnection.connect(), serverConnection.connect()])
    .then(() => {
      rpcClient = new RPCClient(clientConnection, logger, rpcName, 100, 1000)
      rpcServer = new RPCServer(serverConnection, logger, rpcName, 1, 1000)
    })

  after(() => {
    logger.printLogs()
    logger.empty()
  })

  it('RPCClient.call() sends a STRING and RPCServer.consume() receives it', (done) => {
    let stringMessage = 'foobar'
    Promise.all([clientConnection.connect(), serverConnection.connect()])
      .then(() => {
        rpcServer.consume((msg) => {
          if (msg === stringMessage) {
            done()
          } else {
            done(new Error('String received is not the same as the String sent'))
          }
        })
        rpcClient.call(stringMessage, 10000)
      })
  })

  it('RPCClient.call() sends an OBJECT and RPCServer.consume() receives it', (done) => {
    let objectMessage = {foo: 'bar', bar: 'foo'}
    Promise.all([clientConnection.connect(), serverConnection.connect()])
      .then(() => {
        rpcServer.consume((msg) => {
          if (JSON.stringify(msg) === JSON.stringify(objectMessage)) {
            done()
          } else {
            done(new Error('The send OBJECT is not equal to the received one'))
          }
        })
        rpcClient.call(objectMessage, 10000)
      })
  })

  it('RPCClient.call() sends an OBJECT, RPCServer.consume() sends it back and RPCClient receives it intact', (done) => {
    let objectMessage = {foo: 'bar', bar: 'foo'}
    Promise.all([clientConnection.connect(), serverConnection.connect()])
      .then(() => {
        rpcServer.consume((msg) => {
          return msg
        })
        rpcClient.call(objectMessage, 10000).then((res) => {
          if (JSON.stringify(res) === JSON.stringify((objectMessage))) {
            done()
          } else {
            done(new Error('Object sent and received are not equal'))
          }
        })
      })
  })

  it('RPCClient.call() throws an error when the parameter cant be JSON-serialized', (done) => {
    let nonJSONSerializableMessage = {}
    nonJSONSerializableMessage.a = {b: nonJSONSerializableMessage}
    Promise.all([clientConnection.connect(), serverConnection.connect()])
      .then(() => {
        rpcServer.consume((msg) => {
        })
        rpcClient.call(nonJSONSerializableMessage)
          .then(() => done('Did not throw an error'))
          .catch(() => done())
      })
  })
})
