const QueueConnection = require('../src/QueueConnection')
const QueueConfig = require('../src/QueueConfig')
const config = require('./config/LoadConfig')
const chai = require('chai')
const URL = require('node:url').URL
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
      done()
    })
  })

  it('#connect() handles multiple string urls and connects to the first working one', async () => {
    const multiUrlConfig = copyConfig({
      url: [config.url, 'invalid_url']
    })

    const connection = new QueueConnection(multiUrlConfig)
    await connection.connect()
    assert.strictEqual(connection._activeConnectionConfig, config.url)
  })

  it('#connect() handles multiple string urls and tries the next url in the list if one is not working', async () => {
    const multiUrlConfig = copyConfig({
      url: ['invalid_url', config.url]
    })

    const connection = new QueueConnection(multiUrlConfig)
    await connection.connect()
    assert.strictEqual(connection._activeConnectionConfig, config.url)
  })

  it('#connect() handles multiple hosts in an url object and connects to the first working one', async () => {
    const url = new URL(config.url)
    const urlObject = {
      protocol: url.protocol.replace(':', ''),
      hostname: [url.hostname, 'invalid_host'],
      port: parseInt(url.port, 10),
      username: url.username ? url.username : undefined,
      password: url.password ? url.password : undefined
    }
    const multiUrlConfig = copyConfig({
      url: urlObject
    })

    const connection = new QueueConnection(multiUrlConfig)
    await connection.connect()
    assert.strictEqual(connection._activeConnectionConfig.hostname, url.hostname)
  })

  it('#connect() handles multiple hosts in an url object and tries the next url in the list if one is not working', async () => {
    const url = new URL(config.url)
    const urlObject = {
      protocol: url.protocol.replace(':', ''),
      hostname: [url.hostname, 'invalid_host'],
      port: parseInt(url.port, 10),
      username: url.username ? url.username : undefined,
      password: url.password ? url.password : undefined
    }
    const multiUrlConfig = copyConfig({
      url: urlObject
    })

    const connection = new QueueConnection(multiUrlConfig)
    await connection.connect()
    assert.strictEqual(connection._activeConnectionConfig.hostname, url.hostname)
  })
})
