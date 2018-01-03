const QueueConnection = require('../src/QueueConnection')

describe('QueueConnection', () => {
  let config = require('./fixtures/TestConfig')
  let connection = new QueueConnection(config)
  it('#connect() creates a connection to RabbitMQ', (done) => {
    connection.connect()
      .then((c) => {
        done()
      })
      .catch((e) => {
        done(new Error(`connect() failed: ${e}`))
      })
  })
})
