const QueueConnection = require('../src/QueueConnection')
let config

try {
  config = require('./fixtures/TestConfig')
} catch (e) {
  config = require('./fixtures/DefaultConfig')
}

describe('QueueConnection', () => {
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
