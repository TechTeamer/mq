const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

chai.use(chaiAsPromised)

let expect = chai.expect

const QueueConnection = require('../src/QueueConnection')
const QueueConfig = require('../src/QueueConfig')

describe('QueueConnection', () => {
  let connection = new QueueConnection(new QueueConfig(
    {
      url: 'amqps://localhost:5671',
      options: {
        rejectUnauthorized: false,
        cert: '/home/nikolov/workspace/rabbitmq_cert/client/cert.pem',
        key: '/home/nikolov/workspace/rabbitmq_cert/client/key.pem',
        ca: ['/home/nikolov/workspace/rabbitmq_cert/ca/cacert.pem']
      },
      rpcTimeoutMs: 10000,
      rpcQueueMaxSize: 100
    }
  )).connect()
  it('#connect() creates a connection to RabbitMQ', () => {
    return expect(connection).to.eventually.be.fulfilled
  })
})
