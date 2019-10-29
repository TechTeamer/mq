const chai = require('chai')
const assert = chai.assert
const QueueManager = require('../src/QueueManager')
const ConnectionPool = require('../src/ConnectionPool')
const ConsoleInspector = require('./consoleInspector')
const config = require('./config/LoadConfig')

describe('ConnectionPool', () => {
  const logger = new ConsoleInspector(console)
  const pool = new ConnectionPool()
  pool.setLogger(logger)
  pool.setupQueueManagers({
    default: config
  })

  after(() => {
    logger.empty()
  })

  it('Should handle backwards compatible config', () => {
    const pool = new ConnectionPool()
    pool.setLogger(logger)
    pool.setupQueueManagers(config)

    const defaultConnection = pool.getDefaultConnection()

    assert.isTrue(pool.hasConnection('default'), 'default connection is not defined')
    assert.instanceOf(defaultConnection, QueueManager, 'default connection is not an instance of QueueManager')
  })

  it('Should handle multi-connection config', () => {
    const pool = new ConnectionPool()
    pool.setLogger(logger)
    pool.setupQueueManagers({
      default: config,
      other: config
    })

    const defaultConnection = pool.getDefaultConnection()

    assert.isTrue(pool.hasConnection('default'), 'default connection is not defined')
    assert.instanceOf(defaultConnection, QueueManager, 'default connection is not an instance of QueueManager')

    const otherConnection = pool.getConnection('other')

    assert.isTrue(pool.hasConnection('other'), 'other connection is not defined')
    assert.instanceOf(otherConnection, QueueManager, 'other connection is not an instance of QueueManager')
  })

  it('Should connect', (done) => {
    Promise.resolve().then(() => {
      return pool.connect()
    }).then(() => {
      done()
    }).catch((err) => {
      done(err)
    })
  })
})
