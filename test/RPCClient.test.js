const RPCClient = require('../src/RPCClient')
const {assert} = require('chai')

describe('QueueMessage', () => {
  it('works', () => {
    let rpcClient = new RPCClient()
    assert.isTrue(!!rpcClient)
  })
})
