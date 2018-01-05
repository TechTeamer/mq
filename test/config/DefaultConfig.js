const QueueConfig = require('../../src/QueueConfig')

module.exports = new QueueConfig({
  url: 'amqp://guest:guest@localhost:5672',
  options: {
    rejectUnauthorized: false
  },
  rpcTimeoutMs: 10000,
  rpcQueueMaxSize: 100
})
