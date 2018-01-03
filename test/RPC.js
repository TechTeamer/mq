const {fork} = require('child_process')

let channelName = 'TestChannel'
let message = 'RPC test message'

describe('RPCClient && RPCServer', () => {
  it('RPCClient.call() sends a message and RPCServer.consume() consumes it', (done) => {
    const producer = fork('./test/fixtures/rpc-client-producer.js', [channelName, message])
    const consumer = fork('./test/fixtures/rpc-server-consumer.js', [channelName])

    consumer.on('message', (msg) => {
      consumer.kill()
      producer.kill()
      if (msg === message) {
        done()
      } else {
        done(new Error('Wrong msg'))
      }
    })
  })
})
