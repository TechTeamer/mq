const QueueConnection = require('../src/QueueConnection')
const QueueConfig = require('../src/QueueConfig')
const config = require('./config/LoadConfig')
const chai = require('chai')
const assert = chai.assert

function copyConfig (obj) {
  return new QueueConfig({
    ...JSON.parse(JSON.stringify(config)),
    ...obj,
    logger: config.logger
  })
}

describe('QueueConnection', () => {
  it('#connect() creates a connection to RabbitMQ', (done) => {
    const connection = new QueueConnection(config)
    connection.connect()
      .then(() => {
        assert.isNotNull(connection._connection)
        done()
      })
      .catch((e) => {
        done(new Error(`connect() failed: ${e}`))
      })
  })

  it('#connect() fails to connect for invalid connection url', (done) => {
    const multiUrlConfig = copyConfig({
      url: 'invalid_url'
    })

    const connection = new QueueConnection(multiUrlConfig)
    connection.connect().then(() => {
      done(new Error('Should not connect'))
    }).catch(() => {
      assert.isNull(connection._connection)
      done()
    })
  })

  it('#connect() handles multiple string urls and connects to the first working one', async () => {
    const multiUrlConfig = copyConfig({
      url: [config.url, 'invalid_url']
    })

    const connection = new QueueConnection(multiUrlConfig)
    await connection.connect()
    assert.deepEqual(connection._activeConnectionConfig, QueueConfig.urlStringToObject(config.url))
  })

  it('#connect() handles multiple string urls and tries the next url in the list if one is not working', async () => {
    const multiUrlConfig = copyConfig({
      url: ['amqps://random-host:5671', config.url]
    })

    const connection = new QueueConnection(multiUrlConfig)
    await connection.connect()
    assert.deepEqual(connection._activeConnectionConfig, QueueConfig.urlStringToObject(config.url))
  })

  it('#connect() handles multiple hosts in an url object and connects to the first working one', async () => {
    let urlObject
    if (typeof config.url === 'string') {
      urlObject = QueueConfig.urlStringToObject(config.url)
    } else {
      urlObject = { ...config.url }
    }
    urlObject.hostname = [urlObject.hostname, 'invalid_host']

    const multiUrlConfig = copyConfig({
      url: urlObject
    })

    const connection = new QueueConnection(multiUrlConfig)
    await connection.connect()
    assert.deepEqual(connection._activeConnectionConfig, QueueConfig.urlStringToObject(config.url))
  })

  it('#connect() handles multiple hosts in an url object and tries the next url in the list if one is not working', async () => {
    let urlObject
    if (typeof config.url === 'string') {
      urlObject = QueueConfig.urlStringToObject(config.url)
    } else {
      urlObject = { ...config.url }
    }
    urlObject.hostname = ['invalid_host', urlObject.hostname]

    const multiUrlConfig = copyConfig({
      url: urlObject
    })

    const connection = new QueueConnection(multiUrlConfig)
    await connection.connect()
    assert.deepEqual(connection._activeConnectionConfig, QueueConfig.urlStringToObject(config.url))
  })

  it('#close() closes connection to RabbitMQ', async () => {
    const connection = new QueueConnection(config)
    try {
      await connection.connect()
    } catch (e) {
      throw new Error(`connect() failed: ${e}`)
    }

    try {
      await connection.close()
    } catch (e) {
      throw new Error(`close() failed: ${e}`)
    }

    assert.strictEqual(connection._connection, null)
    assert.strictEqual(connection._connectionPromise, null)
  })

  it('#close() closes connection to RabbitMQ and the close event callback is invoked', async () => {
    const connection = new QueueConnection(config)

    let callbackCalled = false
    connection.addListener('close', () => {
      callbackCalled = true
    })

    try {
      await connection.connect()
    } catch (e) {
      throw new Error(`connect() failed: ${e}`)
    }

    try {
      await connection.close()
    } catch (e) {
      throw new Error(`close() failed: ${e}`)
    }

    assert.strictEqual(callbackCalled, true)
  })

  it('#close() closes connection to RabbitMQ and the close event callback is not invoked', async () => {
    const connection = new QueueConnection(config)

    let callbackCalled = false
    connection._onClose = () => {
      callbackCalled = true
    }

    try {
      await connection.connect()
    } catch (e) {
      throw new Error(`connect() failed: ${e}`)
    }

    try {
      await connection.close()
    } catch (e) {
      throw new Error(`close() failed: ${e}`)
    }

    assert.strictEqual(callbackCalled, false)
  })
})
