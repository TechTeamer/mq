const QueueManager = require('../src/QueueManager')
const ConsoleInspector = require('./consoleInspector')
let config = require('./config/LoadConfig')

describe('Publisher && Subscriber with message timeout', function () {
  let publisherName = 'test-publisher-timeout'
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

  this.timeout(10000)

  it('Publisher.send() sends a STRING with a timeout and Subscriber.consume() receives it', (done) => {
    let stringMessage = 'foobar'

    subscriber.consume((msg) => {
      if (msg !== stringMessage) {
        done(new Error('String received is not the same as the String sent'))
        return
      }
      done()
    })

    publisher.send(stringMessage, null, 5000).catch((err) => {
      done(err)
    })
  })

  it('Publisher.send() sends an OBJECT with a timeout and Subscriber.consume() receives it', (done) => {
    let objectMessage = {foo: 'bar', bar: 'foo'}

    subscriber.consume((msg) => {
      if (JSON.stringify(msg) !== JSON.stringify(objectMessage)) {
        done(new Error('The send OBJECT is not equal to the received one'))
        return
      }
      done()
    })

    publisher.send(objectMessage, null, 5000).catch((err) => {
      done(err)
    })
  })

  it('Publisher.send() sends a message with a timeOut and each subscriber receives it', (done) => {
    let otherManager = new QueueManager(config)
    otherManager.setLogger(logger)
    let otherSubscriber = otherManager.getSubscriber(publisherName, {maxRetry, timeoutMs: 10000})

    otherManager.connect().then(() => {
      let stringMessage = 'bazbar'

      let ack1 = false
      let ack2 = false

      subscriber.consume((msg) => {
        if (msg !== stringMessage) {
          done(new Error('String received is not the same as the String sent'))
          return
        }
        if (ack2) {
          done()
        }
        ack1 = true
      })

      otherSubscriber.consume((msg) => {
        if (msg !== stringMessage) {
          done(new Error('String received is not the same as the String sent'))
          return
        }
        if (ack1) {
          done()
        }
        ack2 = true
      })

      publisher.send(stringMessage, null, 5000).catch((err) => {
        done(err)
      })
    }).catch((err) => {
      done(err)
    })
  })
})
