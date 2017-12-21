const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const {fork} = require('child_process')

chai.use(chaiAsPromised)

let expect = chai.expect

let channelName = 'queue-client-queue-server'
let message = 'hi'

describe('QueueClient && QueueServer', () => {
  it('QueueClient.send() sends a message and QueueServer.consume() receives it', (done) => {
    const producer = fork('./test/fixtures/queue-client-producer.js', [channelName, message])
    const consumer = fork('./test/fixtures/queue-server-consumer.js', [channelName])

    consumer.on('message', (msg) => {
      if (msg === message) {
        done()
      } else {
        done(new Error('msg !== message'))
      }
    })
  })
})
