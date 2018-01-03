const RPCClient = require('../src/RPCClient')
const RPCServer = require('../src/RPCServer')
const QueueConnection = require('../src/QueueConnection')
const chai = require('chai')
const expect = chai.expect

describe('RPCClient && RPCServer', () => {
  let rpcName = 'test-rpc'
  let stringMessage = 'foobar'
  let objectMessage = {foo: 'bar', bar: 'foo'}
  let nonJSONSerializableMessage = {}
  const config = require('./fixtures/TestConfig')
  const clientConnection = new QueueConnection(config)
  const serverConnection = new QueueConnection(config)
  let rpcClient
  let rpcServer
  //
  Promise.all([clientConnection.connect(), serverConnection.connect()])
    .then(() => {
      rpcClient = new RPCClient(clientConnection, console, rpcName, 100, 10000)
      rpcServer = new RPCServer(serverConnection, console, rpcName, 1, 10000)
    })

  it('RPCClient.call() sends a STRING and RPCServer.consume() receives it', (done) => {
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

  // TODO: Fix
  it('RPCClient.call() throws an error when the parameter cant be stringified', () => {
    Promise.all([clientConnection.connect(), serverConnection.connect()])
      .then(() => {
        rpcServer.consume((msg) => {
          done()
        })
      })
  })
})
