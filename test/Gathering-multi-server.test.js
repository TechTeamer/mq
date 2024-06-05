import QueueManager from '../src/QueueManager.js'
import GatheringServer from '../src/GatheringServer.js'
import ConsoleInspector from './consoleInspector.js'
import config from './config/LoadConfig.js'

describe('GatheringClient && multiple GatheringServer', () => {
  const gatheringName = 'techteamer-mq-js-test-gathering-multi'
  const logger = new ConsoleInspector(console)
  const timeoutMs = 1000
  const assertExchangeOptions = { durable: false, autoDelete: true }
  const queueManager = new QueueManager(config)
  queueManager.setLogger(logger)

  const gatheringClient = queueManager.getGatheringClient(gatheringName, { queueMaxSize: 100, timeoutMs, assertExchangeOptions })
  const gatheringServer1 = new GatheringServer(queueManager.connection, queueManager._logger, gatheringName, { prefetchCount: 1, timeoutMs, assertExchangeOptions })
  const gatheringServer2 = new GatheringServer(queueManager.connection, queueManager._logger, gatheringName, { prefetchCount: 1, timeoutMs, assertExchangeOptions })

  before(() => {
    return queueManager.connect().then(() => {
      return gatheringServer1.initialize()
    }).then(() => {
      return gatheringServer2.initialize()
    })
  })

  after(() => {
    logger.empty()
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

  it('GatheringClient.request() sends something and every GatheringServer replies with ok status', (done) => {
    const stringMessage = 'hello'
    gatheringServer1.consume(() => {
      return stringMessage
    })
    gatheringServer2.consume(() => {
      return stringMessage
    })

    gatheringClient.request(stringMessage, 10000).then((msg) => {
      if (msg === stringMessage) {
        done()
      } else {
        done(new Error('String received is not the same as the String sent'))
      }
      return true
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

  it('gatheringClient.request() rejects when all consumers time out', (done) => {
    const messageBody = 'hello'
    gatheringServer1.consume(() => {
      // undefined is implied not found
      return new Promise(resolve => setTimeout(resolve, 500))
    })
    gatheringServer2.consume(() => {
      // undefined is implied not found
      return new Promise(resolve => setTimeout(resolve, 500))
    })

    gatheringClient.request(messageBody, 100, null, false, false).then((res) => {
      done(new Error('Should reject'))
    }).catch((err) => {
      if (err.message.includes('QUEUE GATHERING RESPONSE TIMED OUT')) {
        done()
      } else {
        done(err)
      }
    })
  })
})
