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

const config = require('./config/LoadConfig')

describe('QueueManager', () => {
  const logger = new ConsoleInspector(console)
  const manager = new QueueManager(config)
  const defaultOptionsOverride = {
    durable: false,
    autoDelete: false
  }
  const managerWithDefaultOptions = new QueueManager({
    ...config,
    rpcClientAssertReplyQueueOptions: defaultOptionsOverride,
    rpcClientExchangeOptions: defaultOptionsOverride,
    rpcServerAssertQueueOptions: defaultOptionsOverride,
    rpcServerExchangeOptions: defaultOptionsOverride,
    publisherAssertExchangeOptions: defaultOptionsOverride,
    subscriberAssertQueueOptions: defaultOptionsOverride,
    subscriberAssertExchangeOptions: defaultOptionsOverride,
    gatheringClientAssertQueueOptions: defaultOptionsOverride,
    gatheringClientAssertExchangeOptions: defaultOptionsOverride,
    gatheringServerAssertQueueOptions: defaultOptionsOverride,
    gatheringServerAssertExchangeOptions: defaultOptionsOverride,
    queueClientAssertQueueOptions: defaultOptionsOverride,
    queueServerAssertQueueOptions: defaultOptionsOverride
  })

  after(() => {
    logger.empty()
  })

  it('Manager can get Publisher && Subscriber', () => {
    const exchange = 'test-pubsub'
    const publisher = manager.getPublisher(exchange)
    const subscriber = manager.getSubscriber(exchange)

    assert.instanceOf(publisher, Publisher, 'not an instance of Publisher')
    assert.instanceOf(subscriber, Subscriber, 'not an instance of Subscriber')
  })

  it('Manager can get QueueClient && QueueServer', () => {
    const queue = 'test-queue'
    const queueClient = manager.getQueueClient(queue)
    const queueServer = manager.getQueueServer(queue)

    assert.instanceOf(queueClient, QueueClient, 'not an instance of QueueClient')
    assert.instanceOf(queueServer, QueueServer, 'not an instance of QueueServer')
  })

  it('Manager can get RPCClient && RPCServer', () => {
    const rpc = 'test-rpc'
    const rpcClient = manager.getRPCClient(rpc)
    const rpcServer = manager.getRPCServer(rpc)

    assert.instanceOf(rpcClient, RPCClient, 'not an instance of RPCClient')
    assert.instanceOf(rpcServer, RPCServer, 'not an instance of RPCServer')
  })

  // ==== RPCClient/RPCServer override

  it('Provide a valid override class for RPCClient', () => {
    const name = 'test-rpc-override-valid'

    class Override extends RPCClient {
    }

    const rpcClient = manager.getRPCClient(name, Override)

    assert.instanceOf(rpcClient, RPCClient, 'not an instance of RPCClient')
    assert.instanceOf(rpcClient, Override, 'not an instance of Override')
  })

  it('Provide an invalid override class for RPCClient', () => {
    const name = 'test-rpc-override-invalid'

    class Override {
    }

    assert.throws(() => {
      manager.getRPCClient(name, Override)
    })
  })

  it('Provide a valid override class for RPCServer', () => {
    const name = 'test-rpc-override-valid'

    class Override extends RPCServer {
    }

    const rpcServer = manager.getRPCServer(name, Override)

    assert.instanceOf(rpcServer, RPCServer, 'not an instance of RPCServer')
    assert.instanceOf(rpcServer, Override, 'not an instance of Override')
  })

  it('Provide an invalid override class for RPCServer', () => {
    const name = 'test-rpc-override-invalid'

    class Override {
    }

    assert.throws(() => {
      manager.getRPCServer(name, Override)
    })
  })

  // ==== QueueClient/QueueServer override

  it('Provide a valid override class for QueueClient', () => {
    const name = 'test-queue-override-valid'

    class Override extends QueueClient {
    }

    const queueClient = manager.getQueueClient(name, Override)

    assert.instanceOf(queueClient, QueueClient, 'not an instance of QueueClient')
    assert.instanceOf(queueClient, Override, 'not an instance of Override')
  })

  it('Provide an invalid override class for QueueClient', () => {
    const name = 'test-queue-override-invalid'

    class Override {
    }

    assert.throws(() => {
      manager.getRPCClient(name, Override)
    })
  })

  it('Provide a valid override class for QueueServer', () => {
    const name = 'test-queue-override-valid'

    class Override extends QueueServer {
    }

    const queueServer = manager.getQueueServer(name, Override)

    assert.instanceOf(queueServer, QueueServer, 'not an instance of QueueServer')
    assert.instanceOf(queueServer, Override, 'not an instance of Override')
  })

  it('Provide an invalid override class for QueueServer', () => {
    const rpc = 'test-queue-override-invalid'

    class Override {
    }

    assert.throws(() => {
      manager.getQueueServer(rpc, Override)
    })
  })

  // ==== Publisher/Subscriber override

  it('Provide a valid override class for Publisher', () => {
    const name = 'test-pubsub-override-valid'

    class Override extends Publisher {
    }

    const publisher = manager.getPublisher(name, Override)

    assert.instanceOf(publisher, Publisher, 'not an instance of Publisher')
    assert.instanceOf(publisher, Override, 'not an instance of Override')
  })

  it('Provide an invalid override class for Publisher', () => {
    const name = 'test-pubsub-override-invalid'

    class Override {
    }

    assert.throws(() => {
      manager.getPublisher(name, Override)
    })
  })

  it('Provide a valid override class for Subscriber', () => {
    const name = 'test-pubsub-override-valid'

    class Override extends Subscriber {
    }

    const subscriber = manager.getSubscriber(name, Override)

    assert.instanceOf(subscriber, Subscriber, 'not an instance of Subscriber')
    assert.instanceOf(subscriber, Override, 'not an instance of Override')
  })

  it('Provide an invalid override class for Subscriber', () => {
    const rpc = 'test-pubsub-override-invalid'

    class Override {
    }

    assert.throws(() => {
      manager.getSubscriber(rpc, Override)
    })
  })

  // Default options
  it('Manager can get Publisher && Subscriber with modified default options', () => {
    const exchange = 'test-pubsub'
    const publisher = managerWithDefaultOptions.getPublisher(exchange)
    const subscriber = managerWithDefaultOptions.getSubscriber(exchange)

    assert.instanceOf(publisher, Publisher, 'not an instance of Publisher')
    assert.instanceOf(subscriber, Subscriber, 'not an instance of Subscriber')

    assert.isFalse(publisher._assertExchangeOptions.durable)
    assert.isFalse(publisher._assertExchangeOptions.autoDelete)

    assert.isFalse(subscriber._assertQueueOptions.durable)
    assert.isFalse(subscriber._assertQueueOptions.autoDelete)
    assert.isFalse(subscriber._assertExchangeOptions.durable)
    assert.isFalse(subscriber._assertExchangeOptions.autoDelete)
  })

  it('Manager can get QueueClient && QueueServer with modified default options', () => {
    const queue = 'test-queue'
    const queueClient = managerWithDefaultOptions.getQueueClient(queue)
    const queueServer = managerWithDefaultOptions.getQueueServer(queue)

    assert.instanceOf(queueClient, QueueClient, 'not an instance of QueueClient')
    assert.instanceOf(queueServer, QueueServer, 'not an instance of QueueServer')

    assert.isFalse(queueClient._assertQueueOptions.durable)
    assert.isFalse(queueClient._assertQueueOptions.autoDelete)

    assert.isFalse(queueServer._assertQueueOptions.durable)
    assert.isFalse(queueServer._assertQueueOptions.autoDelete)
  })

  it('Manager can get RPCClient && RPCServer with modified default options', () => {
    const rpc = 'test-rpc'
    const rpcClient = managerWithDefaultOptions.getRPCClient(rpc)
    const rpcServer = managerWithDefaultOptions.getRPCServer(rpc)

    assert.instanceOf(rpcClient, RPCClient, 'not an instance of RPCClient')
    assert.instanceOf(rpcServer, RPCServer, 'not an instance of RPCServer')

    assert.isFalse(rpcClient._assertReplyQueueOptions.durable)
    assert.isFalse(rpcClient._assertReplyQueueOptions.autoDelete)
    assert.isFalse(rpcClient._exchangeOptions.durable)
    assert.isFalse(rpcClient._exchangeOptions.autoDelete)

    assert.isFalse(rpcServer._assertQueueOptions.durable)
    assert.isFalse(rpcServer._assertQueueOptions.autoDelete)
    assert.isFalse(rpcServer._exchangeOptions.durable)
    assert.isFalse(rpcServer._exchangeOptions.autoDelete)
  })
})
