const {fork} = require('child_process')

let channelName = 'queue-client-queue-server'
let message = 'ASDF'

describe('QueueClient && QueueServer', () => {
  it('QueueClient.send() sends a message and QueueServer.consume() receives it', (done) => {
    let producer = fork('./test/fixtures/queue-client-producer.js', [channelName, message])
    let consumer = fork('./test/fixtures/queue-server-consumer.js', [channelName])

    consumer.on('message', (msg) => {
      if (msg === message) {
        done()
      } else {
        done(new Error('msg !== message'))
      }
      consumer.kill()
      producer.kill()
    })
  })
})
