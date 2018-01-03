const QueueConnection = require('../../src/QueueConnection')
const RPCClient = require('../../src/RPCClient')
const QueueConfig = require('../../src/QueueConfig')

let connection = new QueueConnection(new QueueConfig(
  {
    url: 'amqps://localhost:5671',
    options: {
      rejectUnauthorized: false,
      cert: '/workspace/vuer_docker/workspace/cert/vuer_mq_cert/client/cert.pem',
      key: '/workspace/vuer_docker/workspace/cert/vuer_mq_cert/client/key.pem',
      ca: ['/workspace/vuer_docker/workspace/cert/vuer_mq_cert/ca/cacert.pem']
    },
    rpcTimeoutMs: 10000,
    rpcQueueMaxSize: 100
  }
))

let rpcName = process.argv[2]

connection.connect()
  .then((c) => {
    return new RPCClient(connection, console, rpcName, 100, 2000)
  })
  .then((client) => {
    client.call(process.argv[3], 20000)
  })
