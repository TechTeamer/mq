const QueueConnection = require('../src/QueueConnection')
const config = require('./config/LoadConfig')

describe('QueueConnection', () => {
  const connection = new QueueConnection(config)
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
