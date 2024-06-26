import { describe, it, afterAll, assert } from 'vitest'
import QueueManager from '../src/QueueManager.js'
import ConnectionPool from '../src/ConnectionPool.js'
import ConsoleInspector from './consoleInspector.js'
import QueueConfig from '../src/QueueConfig.js'
import config from './config/LoadConfig.js'

describe('ConnectionPool', () => {
  const logger = new ConsoleInspector(console)

  afterAll(() => {
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

  it('Should connect', () => new Promise((resolve) => {
    const pool = new ConnectionPool()
    pool.setLogger(logger)
    pool.setupQueueManagers({
      default: config
    })
    Promise.resolve().then(() => {
      return pool.connect()
    }).then(() => {
      // Assert every QueueConnection connected
      pool.connections.forEach(manager => {
        assert.isNotNull(manager.connection._connection)
      })
      resolve()
    }).catch((err) => {
      resolve(err)
    })
  }))

  it('Should not connect to wrong config', () => new Promise((resolve) => {
    const pool = new ConnectionPool()
    pool.setLogger(logger)
    pool.setupQueueManagers({
      default: new QueueConfig({
        url: 'amqps://localhost:22',
        rpcTimeoutMs: 10000,
        rpcQueueMaxSize: 100,
        logger,
        options: {
          timeout: 50
        }
      })
    })
    Promise.resolve().then(() => {
      return pool.connect()
    }).then(() => {
      resolve('Connection with wrong config should not connect')
    }).catch((err) => {
      assert.instanceOf(err, Error, 'Connection with wrong config should throw an error ')
      resolve()
    })
  }))

  it('Should reconnect', () => new Promise((resolve) => {
    const pool = new ConnectionPool()
    pool.setLogger(logger)
    pool.setupQueueManagers({
      default: config
    })
    Promise.resolve().then(() => {
      return pool.connect()
    }).then(() => {
      return pool.reconnect()
    }).then(() => {
      // Assert every QueueConnection connected
      pool.connections.forEach(manager => {
        assert.isNotNull(manager.connection._connection)
      })
      resolve()
    }).catch((err) => {
      resolve(err)
    })
  }))

  it('should reconnect if the connection is already closed', async () => {
    const pool = new ConnectionPool()
    pool.setLogger(logger)
    pool.setupQueueManagers({
      default: config
    })
    try {
      await pool.connect()
      const queueManager = pool.getConnection('default')
      await queueManager.connection.close()
      await pool.reconnect()

      assert.isNotNull(queueManager.connection._connection)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
  })

  it('Should not reconnect to wrong config', () => new Promise((resolve) => {
    const pool = new ConnectionPool()
    pool.setLogger(logger)
    pool.setupQueueManagers({
      default: config
    })
    Promise.resolve().then(() => {
      return pool.connect()
    }).then(() => {
      pool.setupQueueManagers({
        default: new QueueConfig({
          url: 'amqps://localhost:22',
          rpcTimeoutMs: 10000,
          rpcQueueMaxSize: 100,
          logger,
          options: {
            timeout: 50
          }
        })
      })

      return pool.reconnect()
    }).then(() => {
      resolve('Reconnection with wrong config should not connect')
    }).catch((err) => {
      assert.instanceOf(err, Error, 'Reconnection with wrong config should throw an error ')
      resolve()
    })
  }))
})
