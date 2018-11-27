const QueueManager = require('../src/QueueManager')
const ConsoleInspector = require('./consoleInspector')
let config = require('./config/LoadConfig')

describe('RPCClient && RPCServer actions', function () {
  let rpcName = 'test-rpc-action'
  const logger = new ConsoleInspector(console)
  let timeoutMs = 1000

  const queueManager = new QueueManager(config)
  queueManager.setLogger(logger)

  let rpcClient = queueManager.getRPCClient(rpcName, {queueMaxSize: 100, timeoutMs})
  let rpcServer = queueManager.getRPCServer(rpcName, {prefetchCount: 1, timeoutMs})

  before(() => {
    return queueManager.connect()
  })

  after(() => {
    logger.empty()
  })

  it('RPCServer.registerAction() registers the action, RPCClient.callAction() sends a STRING and the registered callback for the action receives it', (done) => {
    let stringMessage = 'foobar'

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
