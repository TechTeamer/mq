const chai = require('chai')
const assert = chai.assert
const QueueManager = require('../src/QueueManager')
const QueueClient = require('../src/QueueClient')
const QueueServer = require('../src/QueueServer')
const RPCClient = require('../src/RPCClient')
const RPCServer = require('../src/RPCServer')
const ConsoleInspector = require('./consoleInspector')

const config = require('./config/LoadConfig')

describe('QuorumQueues', () => {
  const logger = new ConsoleInspector(console)
  const defaultOptionsOverride = {
    arguments: {
      'x-queue-type': 'quorum'
    }
  }
  const quorumManager = new QueueManager({
    ...config,
    rpcServerAssertQueueOptions: defaultOptionsOverride,
    queueClientAssertQueueOptions: defaultOptionsOverride,
    queueServerAssertQueueOptions: defaultOptionsOverride
  })

  after(() => {
    logger.empty()
  })

  // Default options
  it('Manager can get QueueClient && QueueServer with modified default options', () => {
    const queue = 'test-queue'
    const queueClient = quorumManager.getQueueClient(queue)
    const queueServer = quorumManager.getQueueServer(queue)

    assert.instanceOf(queueClient, QueueClient, 'not an instance of QueueClient')
    assert.instanceOf(queueServer, QueueServer, 'not an instance of QueueServer')

    assert.equal(queueClient._assertQueueOptions.arguments['x-queue-type'], 'quorum')
    assert.equal(queueServer._assertQueueOptions.arguments['x-queue-type'], 'quorum')
  })

  it('Manager can get RPCClient && RPCServer with modified default options', () => {
    const rpc = 'test-rpc'
    const rpcClient = quorumManager.getRPCClient(rpc)
    const rpcServer = quorumManager.getRPCServer(rpc)

    assert.instanceOf(rpcClient, RPCClient, 'not an instance of RPCClient')
    assert.instanceOf(rpcServer, RPCServer, 'not an instance of RPCServer')

    assert.isUndefined(rpcClient._assertReplyQueueOptions.arguments)
    assert.equal(rpcServer._assertQueueOptions.arguments['x-queue-type'], 'quorum')
  })
})
