const QueueMessage = require('../src/QueueMessage')
const QueueClient = require('../src/QueueClient')
const QueueServer = require('../src/QueueServer')

describe('QueueClient && QueueServer', () => {
  let queueName = 'test-queue'
  let message = new QueueMessage('ok', 'TEST DATA: Queue.test.js')
  const clientConnection = require('./fixtures/TestConfig')()
  const serverConnection = require('./fixtures/TestConfig')()
  it('QueueClient.send() sends a message and QueueServer.consume() receives it', (done) => {
    clientConnection.connect()
      .then(() => {
        return new QueueClient(clientConnection, console, queueName)
      })
      .then((qc) => {
        qc.send(message, '12345')
      })

    serverConnection.connect()
      .then(() => {
        return new QueueServer(serverConnection, console, queueName, 1, 5, 10000)
      })
      .then((qs) => {
        qs.consume((msg) => {
          if (msg.data === message.data) {
            done()
          } else {
            done(new Error('msg.data != message.data'))
          }
        })
      })
  })
})
