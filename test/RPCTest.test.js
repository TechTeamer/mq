const {fork} = require('child_process')

let channelName = 'rpc-client-rpc-server-test'
let message = 'RPC Client & RPC Server test message'

describe('RPCClient && RPCServer', () => {
  it('RPCClient.call() sends a message and RPCServer.consume() consumes it', (done) => {
    fork('./test/fixtures/rpc-client-producer.js', [channelName, message])
    const consumer = fork('./test/fixtures/rpc-server-consumer.js', [channelName])

    consumer.on('message', (msg) => {
      if (msg === message) {
        consumer.kill()
        done()
      } else {
        consumer.kill()
        done(new Error('msg !== message'))
      }
    })
  })
})
