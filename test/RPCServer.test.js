const RPCServer = require('../src/RPCServer')
const {assert} = require('chai')

describe('QueueMessage', () => {
  it('works', () => {
    let rpcServer = new RPCServer()
    assert.isTrue(!!rpcServer)
  })
})
