const QueueConfig = require('../../src/QueueConfig')

module.exports = new QueueConfig({
  url: 'amqps://localhost',
  options: {
    rejectUnauthorized: false
  },
  rpcTimeoutMs: 10000,
  rpcQueueMaxSize: 100
})
