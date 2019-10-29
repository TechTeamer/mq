const QueueManager = require('../src/QueueManager')
const ConsoleInspector = require('./consoleInspector')
const config = require('./config/LoadConfig')

describe('RPCClient && RPCServer actions', function () {
  const rpcName = 'test-rpc-action'
  const logger = new ConsoleInspector(console)
  const timeoutMs = 1000

  const queueManager = new QueueManager(config)
  queueManager.setLogger(logger)

  const rpcClient = queueManager.getRPCClient(rpcName, { queueMaxSize: 100, timeoutMs })
  const rpcServer = queueManager.getRPCServer(rpcName, { prefetchCount: 1, timeoutMs })

  before(() => {
    return queueManager.connect()
  })

  after(() => {
    logger.empty()
  })

  it('RPCServer.registerAction() registers the action, RPCClient.callAction() sends a STRING and the registered callback for the action receives it', (done) => {
    const stringMessage = 'foobar'

    rpcServer.registerAction('compareString', (msg) => {
      if (msg === stringMessage) {
        done()
      } else {
        done(new Error('The compared String is not equal to the String that was sent'))
      }
    })

    rpcClient.callAction('compareString', stringMessage, 1000).catch((err) => {
      done(err)
    })
  })
})
