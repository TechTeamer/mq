const QueueManager = require('../src/QueueManager')
const GatheringServer = require('../src/GatheringServer')
const ConsoleInspector = require('./consoleInspector')
const config = require('./config/LoadConfig')

describe('GatheringClient && multiple GatheringServer', () => {
  const gatheringName = 'test-gathering-multi'
  const logger = /*new ConsoleInspector*/(console)
  const timeoutMs = 1000

  const queueManager = new QueueManager(config)
  queueManager.setLogger(logger)

  const gatheringClient = queueManager.getGatheringClient(gatheringName, { queueMaxSize: 100, timeoutMs })
  const gatheringServer1 = new GatheringServer(queueManager.connection, queueManager._logger, gatheringName, { prefetchCount: 1, timeoutMs })
  const gatheringServer2 = new GatheringServer(queueManager.connection, queueManager._logger, gatheringName, { prefetchCount: 1, timeoutMs })

  before(() => {
    return queueManager.connect().then(() => {
      return gatheringServer1.initialize()
    }).then(() => {
      return gatheringServer2.initialize()
    })
  })

  after(() => {
    // logger.empty()
  })

  it('GatheringClient.request() sends something and one of the GatheringServers reply in time with setting ok response status', (done) => {
    const messageBody = 'hello'
    gatheringServer1.consume((msg, message, response) => {
      response.setStatus(response.NOT_FOUND)
    })
    gatheringServer2.consume((msg, message, response) => {
      response.setStatus(response.OK)
      return msg
    })

    gatheringClient.request(messageBody, 10000).then((res) => {
      done()
    }).catch((err) => {
      done(err)
    })
  })

  it('GatheringClient.request() sends something and one of the GatheringServers reply in time with implied ok response status', (done) => {
    const messageBody = 'hello'
    gatheringServer1.consume((msg, message, response) => {
      response.setStatus(response.NOT_FOUND)
    })
    gatheringServer2.consume((msg) => {
      return msg
    })

    gatheringClient.request(messageBody, 10000).then((res) => {
      done()
    }).catch((err) => {
      done(err)
    })
  })

  it('GatheringClient.request() sends something and every GatheringServer replies with not_found status', (done) => {
    const messageBody = 'hello'
    gatheringServer1.consume((msg, message, response) => {
      response.setStatus(response.NOT_FOUND)
    })
    gatheringServer2.consume((msg, message, response) => {
      response.setStatus(response.NOT_FOUND)
    })

    gatheringClient.request(messageBody, 10000).then((res) => {
      done()
    }).catch((err) => {
      done(err)
    })
  })

  it('GatheringServer.consume() undefined reply implies not_found status and request resolves with undefined', (done) => {
    const messageBody = 'hello'
    gatheringServer1.consume(() => {
      // undefined is implied not found
    })
    gatheringServer2.consume(() => {
      // undefined is implied not found
    })

    gatheringClient.request(messageBody, 10000).then((res) => {
      if (typeof res === 'undefined') {
        done()
      } else {
        done(new Error('Should have resolved with undefined'))
      }
    }).catch((err) => {
      done(err)
    })
  })

  it('gatheringClient.request(acceptNotFound=false) rejects not found statuses', (done) => {
    const messageBody = 'hello'
    gatheringServer1.consume(() => {
      // undefined is implied not found
    })
    gatheringServer2.consume(() => {
      // undefined is implied not found
    })

    gatheringClient.request(messageBody, 10000, null, false, false).then((res) => {
      done(new Error('Should reject not found with acceptNotFound=false'))
    }).catch(() => {
      done()
    })
  })
})
