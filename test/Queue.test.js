const QueueClient = require('../src/QueueClient')
const QueueServer = require('../src/QueueServer')
const QueueConnection = require('../src/QueueConnection')
const chai = require('chai')

describe('QueueClient && QueueServer', () => {
  let queueName = 'test-queue'
  let stringMessage = 'foobar'
  let objectMessage = {foo: 'bar', bar: 'foo'}
  let nonJSONSerializableMessage = {}
  nonJSONSerializableMessage.a = {b: nonJSONSerializableMessage}
  const config = require('./fixtures/TestConfig')
  let clientConnection = new QueueConnection(config)
  let serverConnection = new QueueConnection(config)
  let queueClient
  let queueServer
  Promise.all([clientConnection.connect(), serverConnection.connect()])
    .then(() => {
      queueClient = new QueueClient(clientConnection, console, queueName)
      queueServer = new QueueServer(serverConnection, console, queueName, 1, 5, 10000)
    })

  it('QueueClient.send() sends a STRING and QueueServer.consume() receives it', (done) => {
    Promise.all([clientConnection.connect(), serverConnection.connect()])
      .then(() => {
        queueServer.consume((msg) => {
          if (msg === stringMessage) {
            done()
          } else {
            done(new Error('String received is not the same as the String sent'))
          }
        })
        queueClient.send(stringMessage)
      })
  })

  it('QueueClient.send() sends an OBJECT and QueueServer.consume() receives it', (done) => {
    Promise.all([clientConnection.connect(), serverConnection.connect()])
      .then(() => {
        queueServer.consume((msg) => {
          if (JSON.stringify(msg) === JSON.stringify(objectMessage)) {
            done()
          } else {
            done(new Error('The send OBJECT is not equal to the received one'))
          }
        })
        queueClient.send(objectMessage)
      })
  })

  it('QueueClient.send() throws an error when the parameter cant be stringified', (done) => {
    Promise.all([clientConnection.connect(), serverConnection.connect()])
      .then(() => {
        queueServer.consume((msg) => {
          done(new Error('Should not send the message'))
        })
        try {
          queueClient.send(nonJSONSerializableMessage)
          done(new Error('Sending a non stringifiable object did not throw an error'))
        } catch (e) {
          done()
        }
      })
  })
})

/*
tesztelési folyamet
 - mindkét connection ready
 - létrehozod mindkét queue objectet (server és client)
 - felaggatod a qs.consume-ot és csak utána küldessz
 */


// tesztesetek
// 1. sima string-et küldessz és átmegy
// 2. object-ek átmennek megfelelően (string key és value-kkal)
// 3. valami nem serializálhatót bedobsz és jön rá a hiba
// 4. correlationId megfelelően megy-e át

