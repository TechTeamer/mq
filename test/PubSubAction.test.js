const QueueManager = require('../src/QueueManager')
const ConsoleInspector = require('./consoleInspector')
let config = require('./config/LoadConfig')

describe('Publisher && Subscriber actions', () => {
  let publisherName = 'test-publisher-action'
  const logger = new ConsoleInspector(console)
  let maxRetry = 5

  let publisherManager = new QueueManager(config)
  publisherManager.setLogger(logger)
  let publisher = publisherManager.getPublisher(publisherName)

  let subscriberManager = new QueueManager(config)
  subscriberManager.setLogger(logger)
  let subscriber = subscriberManager.getSubscriber(publisherName, {maxRetry, timeoutMs: 10000})

  before(() => {
    return publisherManager.connect().then(() => {
      return subscriberManager.connect()
    })
  })

  after(() => {
    logger.empty()
  })

  it('subscriber.registerAction() registers all the actions, publisher.callAction() sends an object and subscriber.consume() process it', (done) => {
    let stringMessage = 'foobar'

    subscriber.registerAction('compareString', (msg) => {
      if (msg === stringMessage) {
        done()
      } else {
        done(new Error('The compared String is not equal to the String that was sent'))
      }
    })

    publisher.sendAction('compareString', stringMessage).catch((err) => {
      done(err)
    })
  })
})
