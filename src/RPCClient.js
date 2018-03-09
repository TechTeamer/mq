const uuid = require('uuid/v4')
const QueueMessage = require('./QueueMessage')
const QueueReply = require('./QueueReply')

/**
 * A queue handler
 * @class RPCClient
 * */
class RPCClient {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} rpcName
   * @param {Object} options
   */
  constructor (queueConnection, logger, rpcName, options) {
    this._connection = queueConnection
    this._logger = logger
    this.name = rpcName
    this._replyQueue = ''
    this._replyQueuePromise = null
    this._correlationIdMap = new Map()

    let {queueMaxSize, timeoutMs} = options
    this._rpcQueueMaxSize = queueMaxSize
    this._rpcTimeoutMs = timeoutMs
  }

  /**
   * @param {Function} resolve
   * @param {Function} reject
   * @param {Number} timeoutMs
   * @param {Object} options
   * @param {Boolean} options.resolveBody
   * @param {Boolean} options.rejectErrors
   * @return {Number} correlation id
   * @private
   */
  _registerMessage (resolve, reject, timeoutMs, options) {
    let correlationId
    let timeoutId
    let timedOut = false

    do {
      correlationId = uuid()
    } while (this._correlationIdMap.has(correlationId))

    this._correlationIdMap.set(correlationId, {
      options,
      resolve: (result) => {
        if (!timedOut) {
          clearTimeout(timeoutId)
          timeoutId = null
          resolve(result)
        }
      },
      reject: (err) => {
        if (!timedOut) {
          clearTimeout(timeoutId)
          timeoutId = null
          reject(err)
        }
      }
    })

    timeoutId = setTimeout(() => {
      timedOut = true
      if (this._correlationIdMap.has(correlationId)) {
        this._correlationIdMap.delete(correlationId)

        reject(new Error('RCPCLIENT MESSAGE TIMEOUT ' + this.name))
      }
    }, timeoutMs || this._rpcTimeoutMs)

    return correlationId
  }

  /**
   * @param {*} content
   * @param {Number} timeoutMs
   * @param {Object} [options] set how reply behaves
   * @param {Boolean} [options.resolveBody=true] resolves with reply body
   * @param {Boolean} [options.rejectErrors=true] rejects reply errors
   * @return {Promise}
   * */
  call (content, timeoutMs, options) {
    let channel

    return Promise.resolve().then(() => {
      if (this._correlationIdMap.size > this._rpcQueueMaxSize) {
        throw new Error('RCPCLIENT QUEUE FULL ' + this.name)
      }
    }).then(() => {
      return this._connection.getChannel().then((ch) => {
        channel = ch
      })
    }).then(() => {
      return this._getReplyQueue(channel)
    }).then((replyQueue) => {
      return new Promise((resolve, reject) => {
        let payload
        let message = new QueueMessage()

        message.setBody(content)

        try {
          payload = message.serialize()
        } catch (err) {
          this._logger.error('CANNOT SEND RPC CALL: Malformed message', this.name, err)
          reject(err)
          return
        }

        let correlationId = this._registerMessage(resolve, reject, timeoutMs, options)

        channel.sendToQueue(this.name, Buffer.from(payload), {
          correlationId: correlationId,
          replyTo: replyQueue
        })
      })
    }).catch((err) => {
      this._logger.error('RPCCLIENT: cannot make rpc call', err)
      throw err
    })
  }

  /**
   * Returns a promise that resolves to the reply queue's name.
   * @return Promise<String>
   * @private
   * */
  _getReplyQueue (ch) {
    if (this._replyQueue) {
      return Promise.resolve(this._replyQueue)
    }

    if (this._replyQueuePromise) {
      return this._replyQueuePromise
    }

    this._replyQueuePromise = ch.assertQueue('', {exclusive: true}).then((replyQueue) => {
      this._replyQueue = replyQueue.queue
      this._replyQueuePromise = null

      ch.consume(this._replyQueue, (msg) => {
        return Promise.resolve().then(() => {
          return this._onReply(msg)
        }).catch((err) => {
          this._logger.error('CANNOT CONSUME RPC CLIENT QUEUE', err)
        })
      }, {noAck: true}).catch((err) => {
        this._logger.error('CANNOT CONSUME RPC CLIENT QUEUE', err)
      })

      return this._replyQueue
    }).catch(err => {
      this._logger.error('CANNOT ASSERT RPC REPLY QUEUE', err)
      throw err
    })

    return this._replyQueuePromise
  }

  /**
   * This method is called when consuming replies
   * @param {Object} message see: http://www.squaremobius.net/amqp.node/channel_api.html#channel_consume
   * @private
   * */
  _onReply (message) {
    if (!message || !message.properties || !message.properties.correlationId) {
      this._logger.error('UNKNOWN RPC REPLY FOR %s', this.name, message)
      return
    }

    if (!this._correlationIdMap.has(message.properties.correlationId)) {
      this._logger.warn('UNABLE TO MATCH RPC REPLY WITH MESSAGE SENT ON %s (possibly timed out)', this.name, message)
      return
    }

    const {resolve, reject, options} = this._correlationIdMap.get(message.properties.correlationId)
    let {resolveBody = true, rejectErrors = true} = options || {}

    this._correlationIdMap.delete(message.properties.correlationId)

    let reply = QueueReply.deserialize(message.content)

    if (reply.status === reply.STATUS_SUCCESS) {
      if (resolveBody) {
        resolve(reply.body)
      } else {
        resolve(reply)
      }
    } else {
      if (rejectErrors) {
        this._logger.error('RPC CLIENT GOT ERROR', this.name, message.properties.correlationId, reply.error)
        let error = new Error(reply.error)
        error.reply = reply
        reject(error)
      } else {
        if (resolveBody) {
          resolve(reply.body)
        } else {
          resolve(reply)
        }
      }
    }
  }
}

module.exports = RPCClient
