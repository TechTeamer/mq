const QueueConnection = require('../src/QueueConnection')
const fs = require('fs')
let config

if (fs.existsSync('./fixtures/TestConfig.js')) {
  config = require('./fixtures/TestConfig')
} else {
  let QueueConfig = require('../src/QueueConfig')
  config = new QueueConfig({
    url: 'amqps://localhost:5672',
    options: {
      rejectUnauthorized: false,
      cert: '',
      key: '',
      ca: []
    },
    rpcTimeoutMs: 10000,
    rpcQueueMaxSize: 100
  })
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
