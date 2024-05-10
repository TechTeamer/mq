import chai from 'chai'
import QueueConfig from '../src/QueueConfig.js'
import config from './config/LoadConfig.js'
const assert = chai.assert
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
