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
      cert: './test/test_certificates/cert.pem',
      key: './test/test_certificates/key.pem',
      ca: ['./test/test_certificates/cacert.pem']
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
