const {fork} = require('child_process')

let channelName = 'queue-client-queue-server'
let message = 'hi'

describe('QueueClient && QueueServer', () => {
  it('QueueClient.send() sends a message and QueueServer.consume() receives it', (done) => {
    fork('./test/fixtures/queue-client-producer.js', [channelName, message])
    const consumer = fork('./test/fixtures/queue-server-consumer.js', [channelName])

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
