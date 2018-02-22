const RPCClient = require('../src/RPCClient')
const RPCServer = require('../src/RPCServer')
const QueueConnection = require('../src/QueueConnection')
const ConsoleInspector = require('./consoleInspector')
let config = require('./config/LoadConfig')

describe('RPCClient && RPCServer', () => {
  let rpcName = 'test-rpc'
  const logger = new ConsoleInspector(console)
  let timeOut = 1000

  const clientConnection = new QueueConnection(config)
  clientConnection.setLogger(logger)
  let rpcClient = new RPCClient(clientConnection, logger, rpcName, 100, timeOut)

  const serverConnection = new QueueConnection(config)
  serverConnection.setLogger(logger)
  let rpcServer = new RPCServer(serverConnection, logger, rpcName, 1, timeOut)

  let initialized = false
  const setupConnections = () => {
    if (initialized) {
      return Promise.resolve()
    }

    initialized = true
    return rpcServer.initialize()
  }

  after(() => {
    logger.printLogs()
    logger.empty()
  })

  it('RPCClient.call() sends a STRING and RPCServer.consume() receives it', (done) => {
    setupConnections().then(() => {
      let stringMessage = 'foobar'
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
    setupConnections().then(() => {
      let objectMessage = {foo: 'bar', bar: 'foo'}
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
    setupConnections().then(() => {
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
      })
    })
  })

  it('RPCClient.call() throws an error when the parameter cant be JSON-serialized', (done) => {
    setupConnections().then(() => {
      let nonJSONSerializableMessage = {}
      nonJSONSerializableMessage.a = {b: nonJSONSerializableMessage}

      rpcServer.consume((msg) => {
        done(new Error('Should not receive the message'))
      })

      rpcClient.call(nonJSONSerializableMessage)
        .then(() => done('Did not throw an error'))
        .catch(() => done())
    })
  })

  it('RPCClient.call() throws an error if it doesnt receive a response sooner than timeOut', (done) => {
    setupConnections().then(() => {
      let objectMessage = {foo: 'bar', bar: 'foo'}

      rpcServer.consume((msg) => {
        let now = new Date().getTime()
        while (new Date().getTime() < now + timeOut + 100) { }
        return msg
      })

      rpcClient.call(objectMessage)
        .then(() => done('Did not throw an error'))
        .catch(() => done())
    })
  })
})
