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
   * @param {Number} rpcQueueMaxSize
   * @param {Number} rpcTimeoutMs
   */
  constructor (queueConnection, logger, rpcName, rpcQueueMaxSize, rpcTimeoutMs) {
    this._connection = queueConnection
    this._logger = logger
    this.name = rpcName
    this._rpcQueueMaxSize = rpcQueueMaxSize
    this._rpcTimeoutMs = rpcTimeoutMs
    this._replyQueue = ''
    this._correlationIdMap = new Map()
  }

  /**
   * @param {*} message
   * @param {Number} timeoutMs
   * @return {Promise}
   * */
  call (message, timeoutMs) {
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
      return this._getReplyQueue(channel).catch((err) => {
        this._logger.error('RPCCLIENT: cannot get reply queue', err)
        throw new Error('Cannot get reply queue')
      })
    }).then((replyQueue) => {
      return new Promise((resolve, reject) => {
        let param
        try {
          param = JSON.stringify(new QueueMessage('ok', message))
        } catch (err) {
          this._logger.error('CANNOT SEND RPC CALL %s #%s', this.name, err)
          reject(err)
          return
        }

        let correlationId
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
          },
          isTimedOut: () => timedOut
        })

        let timedOut = false
        let timeoutId = setTimeout(() => {
          timedOut = true
          if (this._correlationIdMap.has(correlationId)) {
            reject(new Error('RCPCLIENT TIMEOUT ' + this.name))
          }
        }, timeoutMs || this._rpcTimeoutMs)

        channel.sendToQueue(this.name, Buffer.from(param), {
          correlationId: correlationId,
          replyTo: replyQueue
        })
      })
    }).catch((err) => {
      this._logger.error('RPCCLIENT: cannot make rpc call', err)
      throw new Error('RPCCLIENT: cannot make rpc call')
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

    return ch.assertQueue('', {exclusive: true}).then((replyQueue) => {
      this._replyQueue = replyQueue.queue

      ch.consume(this._replyQueue, (msg) => {
        return this._onReply(msg)
      }, {noAck: true}).catch((err) => {
        this._logger.error('CANNOT CONSUME RPC CLIENT QUEUE', err)
      })

      return this._replyQueue
    }).catch(err => {
      this._logger.error('CANNOT ASSERT RPC REPLY QUEUE', err)
    })
  }

  /**
   * This method is called when consuming replies
   * @param {Object} reply see: http://www.squaremobius.net/amqp.node/channel_api.html#channel_consume
   * @private
   * */
  _onReply (reply) {
    if (reply && reply.properties && reply.properties.correlationId && this._correlationIdMap.has(reply.properties.correlationId)) {
      const {resolve, reject, isTimedOut} = this._correlationIdMap.get(reply.properties.correlationId)

      if (isTimedOut && isTimedOut()) {
        return
      }

      this._correlationIdMap.delete(reply.properties.correlationId)

      const replyContent = QueueMessage.fromJSON(reply.content.toString())

      if (replyContent.status === 'ok') {
        resolve(replyContent.data)
      } else {
        this._logger.error('RPC CLIENT GOT ERROR %s #%s', this.name, reply.properties.correlationId, replyContent)
        reject(replyContent.data)
      }
    } else {
      this._logger.error('UNKNOWN RPC REPLY FOR %s', this.name, reply, reply.content.toString())
    }
  }
}

module.exports = RPCClient
