const chai = require('chai')
let assert = chai.assert
const QueueManager = require('../src/QueueManager')
const QueueMessage = require('../src/QueueMessage')
const QueueReply = require('../src/QueueReply')
const ConsoleInspector = require('./consoleInspector')
let config = require('./config/LoadConfig')

describe('RPCClient && RPCServer', () => {
  const number = 1
  const string = 'hello'
  const array = [1, 2, 3]
  const buffer = Buffer.from('test buffer')
  const object = { number, string, array, buffer }
  const cyclic = {}
  cyclic.cycle = cyclic

  let rpcName = 'test-rpc'
  const logger = new ConsoleInspector(console)
  let timeoutMs = 1000

  const clientManager = new QueueManager(config)
  clientManager.setLogger(logger)
  let rpcClient = clientManager.getRPCClient(rpcName, {queueMaxSize: 100, timeoutMs})

  const serverManager = new QueueManager(config)
  serverManager.setLogger(logger)
  let rpcServer = clientManager.getRPCServer(rpcName, {prefetchCount: 1, timeoutMs})

  before(() => {
    return clientManager.connect().then(() => {
      return serverManager.connect()
    })
  })

  after(() => {
    logger.empty()
  })

  describe('RPCServer#consume()', () => {
    it('the return value is used as message body', (done) => {
      rpcServer.consume(() => {
        return string
      })
      rpcClient.call(string, 10000).then((reply) => {
        assert.strictEqual(reply, string)
        done()
      }).catch((err) => {
        done(err)
      })
    })

    it('receives the message body and a QueueReply instance', (done) => {
      rpcServer.consume((message, reply) => {
        try {
          assert.strictEqual(message, string, 'message argument is wrong')
          assert.instanceOf(reply, QueueReply, 'reply argument is wrong')
          done()
        } catch (e) {
          done(e)
        }
      })
      rpcClient.call(string, 10000).catch((err) => {
        done(err)
      })
    })

    it('receives a QueueMessage and a QueueReply instance', (done) => {
      rpcServer.consume((message, reply) => {
        try {
          assert.instanceOf(message, QueueMessage, 'message argument is wrong')
          assert.instanceOf(reply, QueueReply, 'reply argument is wrong')
          done()
        } catch (e) {
          done(e)
        }
      }, {
        consumeWholeMessage: true
      })
      rpcClient.call(string, 10000).catch((err) => {
        done(err)
      })
    })

    // TODO: message reply counterpart
    it('throws an error when the message cant be JSON-serialized', (done) => {
      let nonJSONSerializableMessage = {}
      nonJSONSerializableMessage.a = {b: nonJSONSerializableMessage}

      rpcServer.consume((msg) => {
        done(new Error('Should not receive the message'))
      })

      rpcClient.call(nonJSONSerializableMessage)
        .then(() => done('Did not throw an error'))
        .catch(() => done())
    })

    // type tests

    it('receives the same NUMBER sent', (done) => {
      rpcServer.consume((msg) => {
        try {
          assert.deepEqual(msg, number)
          done()
        } catch (e) {
          done(e)
        }
      })
      rpcClient.call(number, 10000).catch((err) => {
        done(err)
      })
    })

    it('receives the same STRING sent', (done) => {
      rpcServer.consume((msg) => {
        try {
          assert.deepEqual(msg, string)
          done()
        } catch (e) {
          done(e)
        }
      })
      rpcClient.call(string, 10000).catch((err) => {
        done(err)
      })
    })

    it('receives the same ARRAY sent', (done) => {
      rpcServer.consume((msg) => {
        try {
          assert.isArray(msg, array)
          assert.sameMembers(msg, array)
          done()
        } catch (e) {
          done(e)
        }
      })
      rpcClient.call(array, 10000).catch((err) => {
        done(err)
      })
    })

    it('receives the same BUFFER sent', (done) => {
      rpcServer.consume((msg) => {
        try {
          let _buffer = Buffer.from(msg)
          assert.strictEqual(_buffer.toString('utf8'), 'test buffer', 'buffer content not match')
          done()
        } catch (e) {
          done(e)
        }
      })
      rpcClient.call(buffer, 10000).catch((err) => {
        done(err)
      })
    })

    it('receives the same COMPLEX OBJECT sent', (done) => {
      rpcServer.consume((msg) => {
        try {
          assert.isObject(msg, 'not an object')
          assert.hasAllKeys(msg, ['number', 'string', 'array', 'buffer'], 'object members not match')
          assert.strictEqual(msg.number, number, 'number not match')
          assert.strictEqual(msg.string, string, 'string not match')
          assert.isArray(msg.array, array, 'not an array')
          assert.sameMembers(msg.array, array, 'array members not match')
          let buffer = Buffer.from(msg.buffer)
          assert.strictEqual(buffer.toString('utf8'), 'test buffer', 'buffer content not match')
          done()
        } catch (e) {
          done(e)
        }
      })
      rpcClient.call(object, 10000).catch((err) => {
        done(err)
      })
    })
  })

  describe('RPCClient#call()', () => {
    it('resolves with the message body', (done) => {
      rpcServer.consume(() => {
        return string
      })
      rpcClient.call(string, 10000).then((reply) => {
        try {
          assert.strictEqual(reply, string)
          done()
        } catch (e) {
          done(e)
        }
      }).catch((err) => {
        done(err)
      })
    })

    it('resolves with a QueueMessage instance', (done) => {
      rpcServer.consume(() => {
        return string
      })
      rpcClient.call(string, 10000, {resolveBody: false}).then((reply) => {
        try {
          assert.instanceOf(reply, QueueReply)
          done()
        } catch (e) {
          done(e)
        }
      }).catch((err) => {
        done(err)
      })
    })

    it('default reply status is success', (done) => {
      rpcServer.consume(() => {
      })
      rpcClient.call(string, 10000, {resolveBody: false}).then((reply) => {
        assert.strictEqual(reply.status, QueueReply.STATUS_SUCCESS)
        done()
      }).catch((err) => {
        done(err)
      })
    })

    it('resolves with a QueueMessage instance even if the reply contain errors', (done) => {
      rpcServer.consume(() => {
        throw new Error('test error')
      })
      rpcClient.call(string, 10000, {resolveBody: false, rejectErrors: false}).then((reply) => {
        assert.instanceOf(reply, QueueReply, 'Did not resolve with a QueueMessage instance')
        assert.strictEqual(reply.status, QueueReply.STATUS_ERROR, 'Reply has incorrect status')
        done()
      }).catch((err) => {
        done(err)
      })
    })

    // TODO: reply timeout
    it(`throws an error if it doesn't receive a response sooner than ${timeoutMs}ms`, (done) => {
      rpcServer.consume(() => {
        return new Promise((resolve) => {
          setTimeout(resolve, timeoutMs + 100)
        })
      })

      rpcClient.call(string)
        .then(() => done('Did not throw an error'))
        .catch(() => done())
    })

    // type tests

    it('receives the same NUMBER sent', (done) => {
      rpcServer.consume((msg) => {
        return msg
      })
      rpcClient.call(number, 10000).then((res) => {
        assert.strictEqual(res, number)
        done()
      }).catch((err) => {
        done(err)
      })
    })

    it('receives the same STRING sent', (done) => {
      rpcServer.consume((msg) => {
        return msg
      })
      rpcClient.call(string, 10000).then((res) => {
        assert.strictEqual(res, string)
        done()
      }).catch((err) => {
        done(err)
      })
    })

    it('receives the same ARRAY sent', (done) => {
      rpcServer.consume((msg) => {
        return msg
      })
      rpcClient.call(array, 10000).then((res) => {
        assert.isArray(res, array)
        assert.sameMembers(res, array)
        done()
      }).catch((err) => {
        done(err)
      })
    })

    it('receives the same BUFFER sent', (done) => {
      rpcServer.consume((msg) => {
        return msg
      })
      rpcClient.call(buffer, 10000).then((res) => {
        let _buffer = Buffer.from(res)
        assert.strictEqual(_buffer.toString('utf8'), 'test buffer', 'buffer content not match')
        done()
      }).catch((err) => {
        done(err)
      })
    })

    it('receives the same OBJECT sent', (done) => {
      rpcServer.consume((msg) => {
        return msg
      })
      rpcClient.call(object, 10000).then((res) => {
        assert.isObject(res, 'not an object')
        assert.hasAllKeys(res, ['number', 'string', 'array', 'buffer'], 'object members not match')
        assert.strictEqual(res.number, number, 'number not match')
        assert.strictEqual(res.string, string, 'string not match')
        assert.isArray(res.array, array, 'not an array')
        assert.sameMembers(res.array, array, 'array members not match')
        let buffer = Buffer.from(res.buffer)
        assert.strictEqual(buffer.toString('utf8'), 'test buffer', 'buffer content not match')
        done()
      }).catch((err) => {
        done(err)
      })
    })
  })
})
