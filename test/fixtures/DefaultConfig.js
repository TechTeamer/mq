const QueueConfig = require('../../src/QueueConfig')

module.exports = new QueueConfig({
  url: 'amqps://localhost:5671',
  options: {
    rejectUnauthorized: false,
    cert: '',
    key: '',
    ca: ['']
  },
  rpcTimeoutMs: 10000,
  rpcQueueMaxSize: 100
})
