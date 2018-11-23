const QueueManager = require('../src/QueueManager')
const ConsoleInspector = require('./consoleInspector')
let config = require('./config/LoadConfig')

describe('QueueClient && QueueServer with message timeout', function () {
  let queueName = 'test-queue-timeout'
  const logger = new ConsoleInspector(console)
  let maxRetry = 5

  let clientManager = new QueueManager(config)
  clientManager.setLogger(logger)
  let queueClient = clientManager.getQueueClient(queueName)

  let serverManager = new QueueManager(config)
  serverManager.setLogger(logger)
  let options = {prefetchCount: 1, maxRetry, timeoutMs: 10000}
  let queueServer = serverManager.getQueueServer(queueName, options)

  before(() => {
    return clientManager.connect().then(() => {
      return serverManager.connect()
    })
  })

  after(() => {
    logger.empty()
  })

  it('QueueClient.send() sends a STRING with a timeout and QueueServer.consume() receives it', (done) => {
    let stringMessage = 'foobarbaz'
    queueServer.consume((msg) => {
      if (msg !== stringMessage) {
        done(new Error('String received is not the same as the String sent'))
        return
      }
      done()
    })

    queueClient.send(stringMessage, null, 5000).catch((err) => {
      done(err)
    })
  })

  it('QueueClient.send() sends an OBJECT with a timeout and QueueServer.consume() receives it', (done) => {
    let objectMessage = {foo: 'bar', bar: 'foo', baz: 'bam'}
    queueServer.consume((msg) => {
      if (JSON.stringify(msg) !== JSON.stringify(objectMessage)) {
        done(new Error('The send OBJECT is not equal to the received one'))
        return
      }
      done()
    })
    queueClient.send(objectMessage, null, 5000).catch((err) => {
      done(err)
    })
  })
})
