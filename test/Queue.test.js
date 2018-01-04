const QueueClient = require('../src/QueueClient')
const QueueServer = require('../src/QueueServer')
const QueueConnection = require('../src/QueueConnection')
const config = require('./fixtures/TestConfig')

describe('QueueClient && QueueServer', () => {
  let queueName = 'test-queue'
  let clientConnection = new QueueConnection(config)
  let serverConnection = new QueueConnection(config)
  let queueClient
  let queueServer
  Promise.all([clientConnection.connect(), serverConnection.connect()])
    .then(() => {
      queueClient = new QueueClient(clientConnection, config.logger, queueName)
      queueServer = new QueueServer(serverConnection, config.logger, queueName, 1, 5, 10000)
    })

  after(() => {
    config.logger.printLogs()
    config.logger.empty()
  })

  it('QueueClient.send() sends a STRING and QueueServer.consume() receives it', (done) => {
    Promise.all([clientConnection.connect(), serverConnection.connect()])
      .then(() => {
        let stringMessage = 'foobar'
        queueServer.consume((msg) => {
          if (msg !== stringMessage) {
            done(new Error('String received is not the same as the String sent'))
            return
          }

          done()
        })
        queueClient.send(stringMessage)
      })
  })

  it('QueueClient.send() sends an OBJECT and QueueServer.consume() receives it', (done) => {
    Promise.all([clientConnection.connect(), serverConnection.connect()])
      .then(() => {
        let objectMessage = {foo: 'bar', bar: 'foo'}
        queueServer.consume((msg) => {
          if (JSON.stringify(msg) !== JSON.stringify(objectMessage)) {
            done(new Error('The send OBJECT is not equal to the received one'))
            return
          }
          done()
        })
        queueClient.send(objectMessage)
      })
  })

  it('QueueClient.send() throws an error when the parameter is not json-serializeable', (done) => {
    Promise.all([clientConnection.connect(), serverConnection.connect()])
      .then(() => {
        let nonJSONSerializableMessage = {}
        nonJSONSerializableMessage.a = {b: nonJSONSerializableMessage}

        queueServer.consume((msg) => {
          done(new Error('Should not receive the message'))
        })
        try {
          queueClient.send(nonJSONSerializableMessage)
          done(new Error('Sending a non-json-serializeable object did not throw an error'))
        } catch (e) {
          done()
        }
      })
  })
})
