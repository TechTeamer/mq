const path = require('path')
const testProcess = require('./fixtures/test-process')
const {callCommand} = testProcess(path.resolve('./fixtures/test-queue-server'))

describe('QueueMessage', () => {
  it('can connect', () => {
    return callCommand('connect').then((result) => {
      console.log('connect result', result)
    }).catch((err) => {
      console.log('connect error', err)
    })
  })
})
