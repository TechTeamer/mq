const uuid = require('uuid/v4')
const QueueMessage = require('./QueueMessage')

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

    let { queueMaxSize, timeoutMs } = options
    this._rpcQueueMaxSize = queueMaxSize
    this._rpcTimeoutMs = timeoutMs
  }

  /**
   * @param {Function} resolve
   * @param {Function} reject
   * @param {Number} timeoutMs
   * @return {Number} correlation id
   * @private
   */
  _registerMessage (resolve, reject, timeoutMs) {
    let correlationId
    let timeoutId
    let timedOut = false

    do {
      correlationId = uuid()
    } while (this._correlationIdMap.has(correlationId))

    this._correlationIdMap.set(correlationId, {
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

        reject(new Error('RPCCLIENT MESSAGE TIMEOUT ' + this.name))
      }
    }, timeoutMs || this._rpcTimeoutMs)

    return correlationId
  }

  /**
   * @param {*} message
   * @param {Number} timeoutMs
   * @param {Map} attachments
   * @return {Promise}
   * */
  call (message, timeoutMs = null, attachments = null) {
    let channel

    return Promise.resolve().then(() => {
      if (this._correlationIdMap.size > this._rpcQueueMaxSize) {
        throw new Error('RPCCLIENT QUEUE FULL ' + this.name)
      }
    }).then(() => {
      return this._connection.getChannel().then((ch) => {
        channel = ch
      })
    }).then(() => {
      return this._getReplyQueue(channel)
    }).then((replyQueue) => {
      return new Promise((resolve, reject) => {
        let param
        try {
          param = new QueueMessage('ok', message, timeoutMs)
          if (attachments !== null) {
            for (const [key, value] of attachments) {
              param.addAttachment(key, value)
            }
          }
        } catch (err) {
          this._logger.error('CANNOT SEND RPC CALL', this.name, err)
          reject(err)
          return
        }

        let correlationId = this._registerMessage(resolve, reject, timeoutMs)

        channel.sendToQueue(this.name, param.serialize(), {
          correlationId: correlationId,
          replyTo: replyQueue
        })
      })
    }).catch((err) => {
      this._logger.error('RPCCLIENT: cannot make rpc call', err)
      throw new Error(`RPCCLIENT: cannot make rpc call ${err}`)
    })
  }

  /**
   * @param {String} action
   * @param {*} data
   * @param {Number} timeoutMs
   * @param {Map} attachments
   * @return {Promise}
   * */
  callAction (action, data, timeoutMs, attachments) {
    return this.call({ action, data }, timeoutMs, attachments)
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

    this._replyQueuePromise = ch.assertQueue('', { exclusive: true }).then((replyQueue) => {
      this._replyQueue = replyQueue.queue
      this._replyQueuePromise = null

      ch.consume(this._replyQueue, (msg) => {
        return Promise.resolve().then(() => {
          return this._onReply(msg)
        }).catch((err) => {
          this._logger.error('CANNOT CONSUME RPC CLIENT QUEUE', err)
        })
      }, { noAck: true }).catch((err) => {
        this._logger.error('CANNOT SET RPC CLIENT QUEUE CONSUMER', err)
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
   * @param {Object} reply see: http://www.squaremobius.net/amqp.node/channel_api.html#channel_consume
   * @private
   * */
  _onReply (reply) {
    if (!reply || !reply.properties || !reply.properties.correlationId) {
      this._logger.error('UNKNOWN RPC REPLY FOR %s', this.name, reply)
      return
    }

    if (!this._correlationIdMap.has(reply.properties.correlationId)) {
      this._logger.warn('UNABLE TO MATCH RPC REPLY WITH MESSAGE SENT ON %s (possibly timed out)', this.name, reply)
      return
    }

    const { resolve, reject } = this._correlationIdMap.get(reply.properties.correlationId)

    this._correlationIdMap.delete(reply.properties.correlationId)

    const replyContent = QueueMessage.unserialize(reply.content)

    if (replyContent.status === 'ok') {
      resolve(replyContent.data)
    } else {
      this._logger.error('RPC CLIENT GOT ERROR', this.name, reply.properties.correlationId, replyContent)
      reject(replyContent.data)
    }
  }
}

module.exports = RPCClient
