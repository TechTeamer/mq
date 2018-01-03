const QueueConfig = require('../../src/QueueConfig')
const QueueConnection = require('../../src/QueueConnection')

module.exports = new QueueConnection(new QueueConfig(
  {
    url: 'amqps://localhost:5671',
    options: {
      rejectUnauthorized: false,
      cert: '/workspace/vuer_docker/workspace/cert/vuer_mq_cert/client/cert.pem',
      key: '/workspace/vuer_docker/workspace/cert/vuer_mq_cert/client/key.pem',
      ca: ['/workspace/vuer_docker/workspace/cert/vuer_mq_cert/ca/cacert.pem']
    },
    rpcTimeoutMs: 10000,
    rpcQueueMaxSize: 100,
    logger: console
  }
))
