const chai = require('chai')
const assert = chai.assert
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

  // ==== RPCClient/RPCServer override

  it('Provide a valid override class for RPCClient', () => {
    const name = 'test-rpc-override-valid'
    class Override extends RPCClient {}

    const rpcClient = manager.getRPCClient(name, Override)

    assert.instanceOf(rpcClient, RPCClient, 'not an instance of RPCClient')
    assert.instanceOf(rpcClient, Override, 'not an instance of Override')
  })

  it('Provide an invalid override class for RPCClient', () => {
    const name = 'test-rpc-override-invalid'
    class Override {}

    assert.throws(() => {
      manager.getRPCClient(name, Override)
    })
  })

  it('Provide a valid override class for RPCServer', () => {
    const name = 'test-rpc-override-valid'
    class Override extends RPCServer {}

    const rpcServer = manager.getRPCServer(name, Override)

    assert.instanceOf(rpcServer, RPCServer, 'not an instance of RPCServer')
    assert.instanceOf(rpcServer, Override, 'not an instance of Override')
  })

  it('Provide an invalid override class for RPCServer', () => {
    const name = 'test-rpc-override-invalid'
    class Override {}

    assert.throws(() => {
      manager.getRPCServer(name, Override)
    })
  })

  // ==== QueueClient/QueueServer override

  it('Provide a valid override class for QueueClient', () => {
    const name = 'test-queue-override-valid'
    class Override extends QueueClient {}

    const queueClient = manager.getQueueClient(name, Override)

    assert.instanceOf(queueClient, QueueClient, 'not an instance of QueueClient')
    assert.instanceOf(queueClient, Override, 'not an instance of Override')
  })

  it('Provide an invalid override class for QueueClient', () => {
    const name = 'test-queue-override-invalid'
    class Override {}

    assert.throws(() => {
      manager.getRPCClient(name, Override)
    })
  })

  it('Provide a valid override class for QueueServer', () => {
    const name = 'test-queue-override-valid'
    class Override extends QueueServer {}

    const queueServer = manager.getQueueServer(name, Override)

    assert.instanceOf(queueServer, QueueServer, 'not an instance of QueueServer')
    assert.instanceOf(queueServer, Override, 'not an instance of Override')
  })

  it('Provide an invalid override class for QueueServer', () => {
    const rpc = 'test-queue-override-invalid'
    class Override {}

    assert.throws(() => {
      manager.getQueueServer(rpc, Override)
    })
  })

  // ==== Publisher/Subscriber override

  it('Provide a valid override class for Publisher', () => {
    const name = 'test-pubsub-override-valid'
    class Override extends Publisher {}

    const publisher = manager.getPublisher(name, Override)

    assert.instanceOf(publisher, Publisher, 'not an instance of Publisher')
    assert.instanceOf(publisher, Override, 'not an instance of Override')
  })

  it('Provide an invalid override class for Publisher', () => {
    const name = 'test-pubsub-override-invalid'
    class Override {}

    assert.throws(() => {
      manager.getPublisher(name, Override)
    })
  })

  it('Provide a valid override class for Subscriber', () => {
    const name = 'test-pubsub-override-valid'
    class Override extends Subscriber {}

    const subscriber = manager.getSubscriber(name, Override)

    assert.instanceOf(subscriber, Subscriber, 'not an instance of Subscriber')
    assert.instanceOf(subscriber, Override, 'not an instance of Override')
  })

  it('Provide an invalid override class for Subscriber', () => {
    const rpc = 'test-pubsub-override-invalid'
    class Override {}

    assert.throws(() => {
      manager.getSubscriber(rpc, Override)
    })
  })
})
