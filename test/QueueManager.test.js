const QueueManager = require('../src/QueueManager')
const Publisher = require('../src/Publisher')
const Subscriber = require('../src/Subscriber')
const QueueClient = require('../src/QueueClient')
const QueueServer = require('../src/QueueServer')
const RPCClient = require('../src/RPCClient')
const RPCServer = require('../src/RPCServer')
const ConsoleInspector = require('./consoleInspector')

let config = require('./config/LoadConfig')

describe('QueueManager', () => {
  const logger = new ConsoleInspector(console)
  const manager = new QueueManager(config)

  after(() => {
    logger.printLogs()
    logger.empty()
  })

  it('Manager can get Publisher && Subscriber', (done) => {
    const exchange = 'test-pubsub'
    let publisher = manager.getPublisher(exchange)
    let subscriber = manager.getSubscriber(exchange)

    if (!(publisher instanceof Publisher)) {
      return done(new Error(`Couldn't get a Publisher`))
    }

    if (!(subscriber instanceof Subscriber)) {
      return done(new Error(`Couldn't get a Subscriber`))
    }

    done()
  })

  it('Manager can get QueueClient && QueueServer', (done) => {
    const queue = 'test-queue'
    let queueServer = manager.getQueueServer(queue)
    let queueClient = manager.getQueueClient(queue)

    if (!(queueClient instanceof QueueClient)) {
      return done(new Error(`Couldn't get a QueueClient`))
    }

    if (!(queueServer instanceof QueueServer)) {
      return done(new Error(`Couldn't get a QueueServer`))
    }

    done()
  })

  it('Manager can get RPCClient && RPCServer', (done) => {
    const rpc = 'test-rpc'
    let rpcClient = manager.getRPCClient(rpc)
    let rpcServer = manager.getRPCServer(rpc)

    if (!(rpcClient instanceof RPCClient)) {
      return done(new Error(`Couldn't get an RPCClient`))
    }

    if (!(rpcServer instanceof RPCServer)) {
      return done(new Error(`Couldn't get an RPCServer`))
    }

    done()
  })
})
