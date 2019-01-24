const chai = require('chai')
const assert = chai.assert
const QueueConfig = require('../src/QueueConfig')
let config = require('./config/LoadConfig')

describe('QueueConfig', () => {
  it('Should validate test config', () => {
    assert.isTrue(QueueConfig.isValidConfig(config), 'Test config should be valid')
  })

  it('url property', () => {
    assert.isFalse(QueueConfig.isValidConfig({
      nothing: ''
    }), 'Missing url should be invalid')
  })

  it('Cert options', () => {
    assert.isFalse(QueueConfig.isValidConfig({
      url: 'amqps://localhost:5671',
      options: {}
    }), 'Empty options should fail')

    assert.isFalse(QueueConfig.isValidConfig({
      url: 'amqps://localhost:5671',
      options: {
        // cert: '',
        key: 'something',
        ca: 'something'
      }
    }), 'Cert should be required')

    assert.isFalse(QueueConfig.isValidConfig({
      url: 'amqps://localhost:5671',
      options: {
        cert: 'something',
        // key: '',
        ca: 'something'
      }
    }), 'Key should be required')

    assert.isFalse(QueueConfig.isValidConfig({
      url: 'amqps://localhost:5671',
      options: {
        cert: 'something',
        key: 'something'
        // ca: ''
      }
    }), 'ca should be required')

    assert.isTrue(QueueConfig.isValidConfig({
      url: 'amqps://localhost:5671',
      options: {
        cert: 'something',
        key: 'something',
        ca: 'something'
      }
    }), 'rejectUnauthorized is optional')
  })
})
