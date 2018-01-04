const QueueConfig = require('../../src/QueueConfig')
const ConsoleInspector = require('../consoleInspector')

let certPath = '/workspace/vuer_docker/workspace/cert/vuer_mq_cert'

module.exports = new QueueConfig({
  url: 'amqps://localhost:5671',
  options: {
    rejectUnauthorized: false,
    cert: certPath + '/client/cert.pem',
    key: certPath + '/client/key.pem',
    ca: [certPath + '/ca/cacert.pem']
  },
  rpcTimeoutMs: 10000,
  rpcQueueMaxSize: 100,
  logger: new ConsoleInspector(console)
})
