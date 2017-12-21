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
        cert: './test/test_certificates/cert.pem',
        key: './test/test_certificates/key.pem',
        ca: ['./test/test_certificates/cacert.pem']
      },
      rpcTimeoutMs: 1000,
      rpcQueueMaxSize: 100
    }
  )).connect()
  it('#connect() creates a connection to RabbitMQ', () => {
    return expect(connection).to.eventually.be.fulfilled
  })
})
