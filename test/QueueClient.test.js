const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const {fork} = require('child_process')

chai.use(chaiAsPromised)

let expect = chai.expect

let channelName = 'test-channel'
let message = 'test-message'

describe('QueueClient && QueueServer', (done) => {
  it('QueueClient.send() sends a message and QueueServer.consume() receives it', () => {
    const producer = fork('./test/fixtures/queue-client-producer.js', [channelName, message])
    const consumer = fork('./test/fixtures/queue-server-consumer.js', [channelName])

    consumer.on('message', (msg) => {
      if (msg === message){
        done()
      }
    })
  })
})
