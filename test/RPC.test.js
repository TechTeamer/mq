const RPCClient = require('../src/RPCClient')
const RPCServer = require('../src/RPCServer')
const QueueMessage = require('../src/QueueMessage')

describe('RPCClient && RPCServer', () => {
  let rpcName = 'test-rpc'
  let message = new QueueMessage('ok', 'TEST DATA: Queue.test.js')
  const clientConnection = require('./fixtures/TestConfig')
  const serverConnection = require('./fixtures/TestConfig')
  it('RPCClient.call() sends a message and RPCServer.consume() consumes it', (done) => {
    clientConnection.connect()
      .then((c) => {
        return new RPCClient(clientConnection, console, rpcName, 100, 2000)
      })
      .then((client) => {
        client.call(message, 20000)
      })
    serverConnection.connect()
      .then((c) => {
        return new RPCServer(serverConnection, console, rpcName, 1, 2000)
      })
      .then((server) => {
        server.consume((msg) => {
          if (msg.data === message.data) {
            done()
          } else {
            done(new Error('msg.data !== message.data'))
          }
        })
      })
  })
})
