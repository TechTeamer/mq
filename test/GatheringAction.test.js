import QueueManager from '../src/QueueManager.js'
import ConsoleInspector from './consoleInspector.js'
import config from './config/LoadConfig.js'
import chai from 'chai'
const expect = chai.expect
describe('GatheringClient && GatheringServer actions', () => {
  const gatheringName = 'techteamer-mq-js-test-test-gathering-action'
  const logger = new ConsoleInspector(console)
  const timeoutMs = 1000
  const assertExchangeOptions = { durable: false, autoDelete: true }
  const queueManager = new QueueManager(config)
  queueManager.setLogger(logger)
  const gatheringClient = queueManager.getGatheringClient(gatheringName, { queueMaxSize: 100, timeoutMs, assertExchangeOptions })
  const gatheringServer1 = queueManager.getGatheringServer(gatheringName, { prefetchCount: 1, timeoutMs, assertExchangeOptions })
  before(() => {
    return queueManager.connect()
  })
  after(() => {
    logger.empty()
  })
  it('GatheringServer.registerAction() registers the action, GatheringClient.callAction() sends a STRING and the registered callback for the action receives it', (done) => {
    const stringMessage = 'foobar'
    gatheringServer1.registerAction('compareString', (msg) => {
      if (msg === stringMessage) {
        done()
      } else {
        done(new Error(`The compared String is not equal to the String that was sent ${msg}`))
      }
    })
    gatheringClient.requestAction('compareString', stringMessage, 1000).catch((err) => {
      done(err)
    })
  })
  it('GatheringServer handles unserializeable content', (done) => {
    gatheringServer1.registerAction('wrongtest1', () => {
      done(new Error('GatheringServer Action should not be called'))
    })
    const obj = {}
    obj.a = { b: obj }
    gatheringClient.requestAction('wrongtest1', obj, 1000).then(() => {
      done('GatheringServer successfully sent unsendable data')
    }).catch((err) => {
      expect(err).to.be.an.instanceof(Error)
      done()
    })
  })
  it('GatheringServer responds with not found when no action handler is registered', (done) => {
    gatheringClient.requestAction('notfound', 'hello', 1000).then((response) => {
      if (typeof response === 'undefined') {
        done()
      } else {
        done(new Error('Response should have been undefined'))
      }
    }).catch((err) => {
      done(err)
    })
  })
})
