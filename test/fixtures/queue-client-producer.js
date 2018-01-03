const QueueConnection = require('../../src/QueueConnection')
const QueueClient = require('../../src/QueueClient')
const QueueConfig = require('../../src/QueueConfig')

/*
* TODO: refractor
* @argv[2] channel name
* @argv[3] message to send
*
* */

const clientConnection = new QueueConnection(new QueueConfig(
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

clientConnection.connect()
  .then(() => {
    return new QueueClient(clientConnection, console, process.argv[2])
  })
  .then((qc) => {
    qc.send(process.argv[3], '12345')
  })
