const QueueConnection = require('../../src/QueueConnection')
const QueueServer = require('../../src/QueueServer')
const QueueConfig = require('../../src/QueueConfig')

/*
* @argv[2] channel name
* */

const serverConnection = new QueueConnection(new QueueConfig(
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

process.on('disconnect', () => {
  process.exit()
})

serverConnection.connect()
  .then(() => {
    return new QueueServer(serverConnection, console, process.argv[2], 1, 5, 10000)
  })
  .then((qs) => {
    qs.consume((msg) => {
      if (msg !== undefined) {
        process.send(`${msg}`)
      }
    })
  })
