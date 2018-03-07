const RPCClient = require('../src/RPCClient')
const RPCServer = require('../src/RPCServer')
const QueueConnection = require('../src/QueueConnection')
const ConsoleInspector = require('./consoleInspector')
let config = require('./config/LoadConfig')

describe('RPCClient && RPCServer', () => {
  let rpcName = 'test-rpc'
  const logger = new ConsoleInspector(console)
  let timeoutMs = 1000

  const clientConnection = new QueueConnection(config)
  clientConnection.setLogger(logger)
  let rpcClient = new RPCClient(clientConnection, logger, rpcName, {queueMaxSize: 100, timeoutMs})

  const serverConnection = new QueueConnection(config)
  serverConnection.setLogger(logger)
  let rpcServer = new RPCServer(serverConnection, logger, rpcName, {prefetchCount: 1, timeoutMs})

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

  it('RPCClient.call() sends a BUFFER, RPCServer.consume() sends it back and RPCClient receives it intact', (done) => {
    setupConnections().then(() => {
      let buffer = Buffer.from('test content')
      rpcServer.consume((msg) => {
        return msg
      })
      rpcClient.call(buffer, 10000).then((res) => {
        if (Buffer.isBuffer(res) && res.toString('base64') === buffer.toString('base64') && buffer.toString('utf8') === 'test content') {
          done()
        } else {
          done(new Error('Object sent and received are not equal'))
        }
      })
    })
  })

  it('RPCClient.call() sends a COMPLEX object, RPCServer.consume() sends it back and RPCClient receives it intact', (done) => {
    setupConnections().then(() => {
      let buffer = Buffer.from('test content')
      let object = {
        foo: 'bar',
        bar: {
          baz: true,
          arr: [0, 1, 2, 3],
          buff: buffer
        }
      }
      rpcServer.consume((msg) => {
        return msg
      })
      rpcClient.call(object, 10000).then((res) => {
        if (
          !res || typeof res !== 'object' ||
          res.foo !== 'bar' ||
          !res.bar ||
          res.bar.baz !== true ||
          !Array.isArray(res.bar.arr) ||
          res.bar.arr.length !== 4 ||
          res.bar.arr[0] !== 0 || res.bar.arr[1] !== 1 || res.bar.arr[2] !== 2 || res.bar.arr[3] !== 3 ||
          !Buffer.isBuffer(res.bar.buff) || res.bar.buff.toString('base64') !== buffer.toString('base64') || buffer.toString('utf8') !== 'test content'
        ) {
          done(new Error('Object sent and received are not equal'))
        } else {
          done()
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

  it(`RPCClient.call() throws an error if it doesn't receive a response sooner than ${timeoutMs}ms`, (done) => {
    setupConnections().then(() => {
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
})
