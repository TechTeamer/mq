import chai from 'chai'
import QueueManager from '../src/QueueManager.js'
import QueueClient from '../src/QueueClient.js'
import QueueServer from '../src/QueueServer.js'
import RPCClient from '../src/RPCClient.js'
import RPCServer from '../src/RPCServer.js'
import ConsoleInspector from './consoleInspector.js'
import config from './config/LoadConfig.js'
const assert = chai.assert
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
  before(() => {
    quorumManager.connect()
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
