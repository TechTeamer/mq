const { v4: uuid } = require('uuid')
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
    this._correlationIdMap = new Map()

    const { queueMaxSize, timeoutMs } = options
    this._rpcQueueMaxSize = queueMaxSize
    this._rpcTimeoutMs = timeoutMs
  }

  async initialize () {
    const channel = await this._connection.getChannel()
    await this._getReplyQueue(channel)
  }

  /**
   * @param {Function} resolve
   * @param {Function} reject
   * @param {Number} timeoutMs
   * @param {boolean} resolveWithFullResponse
   * @return {Number} correlation id
   * @private
   */
  _registerMessage (resolve, reject, timeoutMs, resolveWithFullResponse) {
    let correlationId
    let timeoutId
    let timedOut = false

    do {
      correlationId = uuid()
    } while (this._correlationIdMap.has(correlationId))

    this._correlationIdMap.set(correlationId, {
      resolveWithFullResponse,
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
   * @param {Boolean} [resolveWithFullResponse=false]
   * @return {Promise<QueueMessage|*>}
   * */
  async call (message, timeoutMs = null, attachments = null, resolveWithFullResponse = false) {
    try {
      if (this._correlationIdMap.size > this._rpcQueueMaxSize) {
        throw new Error('RPCCLIENT QUEUE FULL ' + this.name)
      }
      const channel = await this._connection.getChannel()

      let param
      try {
        param = new QueueMessage('ok', message, timeoutMs)
        if (attachments instanceof Map) {
          for (const [key, value] of attachments) {
            param.addAttachment(key, value)
          }
        }
      } catch (err) {
        this._logger.error('CANNOT SEND RPC CALL', this.name, err)
        throw err
      }

      return await new Promise((resolve, reject) => {
        const correlationId = this._registerMessage(resolve, reject, timeoutMs, resolveWithFullResponse)

        channel.sendToQueue(this.name, param.serialize(), {
          correlationId,
          replyTo: this._replyQueue
        })
      })
    } catch (err) {
      this._logger.error('RPCCLIENT: cannot make rpc call', err)
      throw new Error(`RPCCLIENT: cannot make rpc call ${err}`)
    }
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
  async _getReplyQueue (ch) {
    try {
      const replyQueue = await ch.assertQueue('', { exclusive: true })
      this._replyQueue = replyQueue.queue

      ch.consume(this._replyQueue, (msg) => {
        return Promise.resolve().then(() => {
          return this._onReply(msg)
        }).catch((err) => {
          this._logger.error('CANNOT CONSUME RPC CLIENT QUEUE', err)
        })
      }, { noAck: true }).catch((err) => {
        this._logger.error('CANNOT SET RPC CLIENT QUEUE CONSUMER', err)
      })
    } catch (err) {
      this._logger.error('CANNOT ASSERT RPC REPLY QUEUE', err)
      throw err
    }
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

    const { resolve, reject, resolveWithFullResponse } = this._correlationIdMap.get(reply.properties.correlationId)

    this._correlationIdMap.delete(reply.properties.correlationId)

    const replyContent = QueueMessage.unserialize(reply.content)

    if (replyContent.status === 'ok') {
      if (resolveWithFullResponse) {
        resolve(replyContent)
      } else {
        resolve(replyContent.data)
      }
    } else {
      this._logger.error('RPC CLIENT GOT ERROR', this.name, reply.properties.correlationId, replyContent)
      reject(replyContent.data)
    }
  }
}

module.exports = RPCClient
