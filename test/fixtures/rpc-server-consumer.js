const QueueConnection = require('../../src/QueueConnection')
const RPCServer = require('../../src/RPCServer')
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

let channelName = process.argv[2]

connection.connect()
  .then((c) => {
    return new RPCServer(connection, console, channelName, 1, 2000)
  })
  .then((server) => {
    server.consume((msg) => {
      process.send(`${msg}`)
    })
  })
