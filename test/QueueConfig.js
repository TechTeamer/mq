const chai = require('chai')
const assert = chai.assert
const QueueConfig = require('../src/QueueConfig')
const config = require('./config/LoadConfig')

describe('QueueConfig', () => {
  it('Should validate test config', () => {
    assert.isTrue(QueueConfig.isValidConfig(config), 'Test config should be valid')
  })

  it('url property', () => {
    assert.isFalse(QueueConfig.isValidConfig({
      nothing: ''
    }), 'Missing url should be invalid')
  })
})
