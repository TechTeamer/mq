const QueueConnection = require('../src/QueueConnection')
let config = require('./config/LoadConfig')

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
