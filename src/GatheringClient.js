const { v4: uuid } = require('uuid')
const QueueMessage = require('./QueueMessage')

class GatheringClient {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} name
   */
  constructor (queueConnection, logger, name) {
    this._connection = queueConnection
    this._logger = logger
    this.name = name

    this._correlationIdMap = new Map()
    this._replyQueue = ''
  }

  async initialize () {
    try {
      const channel = await this._connection.getChannel()
      await channel.assertExchange(this.name, 'fanout', { durable: true })

      const replyQueue = await channel.assertQueue('', { exclusive: true })
      this._replyQueue = replyQueue.queue

      channel.consume(this._replyQueue, (reply) => {
        this._handleGatheringResponse(reply).catch(() => {
          // this should not throw
        })
      }, { noAck: true }).catch((err) => {
        this._logger.error('', err)
      })
    } catch (err) {
      this._logger.error('', err)
      throw err
    }
  }

  _handleGatheringResponse (reply) {
    if (!reply || !reply.properties || !reply.properties.correlationId) {
      this._logger.error(`QUEUE GATHERING CLIENT: INVALID REPLY ON '${this.name}': NO REPLY/PROPERTIES/CORRELATION ID`, reply)
      return
    }

    const correlationId = reply.properties.correlationId

    if (!this._correlationIdMap.has(correlationId)) {
      this._logger.warn(`QUEUE GATHERING CLIENT: RECEIVED UNKNOWN REPLY (possibly timed out or duplicate) '${this.name}'`, correlationId)
      return
    }

    const { resolve, reject, resolveWithFullResponse } = this._correlationIdMap.get(correlationId)
    this._correlationIdMap.delete(correlationId)

    const replyContent = QueueMessage.unserialize(reply.content)

    if (replyContent.status === 'ok') {
      if (resolveWithFullResponse) {
        resolve(replyContent)
      } else {
        resolve(replyContent.data)
      }
    } else {
      this._logger.error('QUEUE GATHERING CLIENT: RECEIVED ERROR REPLY', this.name, correlationId, replyContent)
      reject(replyContent.data)
    }
  }

  /**
   * @param {*} data
   * @param {Number} timeoutMs
   * @param {Map} attachments
   * @param {Boolean} [resolveWithFullResponse=false]
   * @return {Promise<QueueMessage|*>}
   * */
  async request (data, timeoutMs = null, attachments = null, resolveWithFullResponse = false) {
    if (this._correlationIdMap.size > this._rpcQueueMaxSize) {
      throw new Error(`QUEUE GATHERING CLIENT: REQUEST LIMIT REACHED '${this.name}'`)
    }

    try {
      const channel = await this._connection.getChannel()

      const param = new QueueMessage('ok', data, timeoutMs)
      if (attachments instanceof Map) {
        for (const [key, value] of attachments) {
          param.addAttachment(key, value)
        }
      }

      return await new Promise((resolve, reject) => {
        const correlationId = this._registerMessage(resolve, reject, timeoutMs, resolveWithFullResponse)

        channel.sendToQueue(this.name, param.serialize(), {
          correlationId: correlationId,
          replyTo: this._replyQueue
        })
      })
    } catch (err) {
      this._logger.error('QUEUE GATHERING CLIENT: failed to send message', err)
      throw new Error(`QUEUE GATHERING CLIENT: failed to send message ${err.message}`)
    }
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

    do {
      correlationId = uuid()
    } while (this._correlationIdMap.has(correlationId))

    this._correlationIdMap.set(correlationId, {
      resolveWithFullResponse: resolveWithFullResponse,
      resolve: (result) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
          resolve(result)
        }
      },
      reject: (err) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
          reject(err)
        }
      }
    })

    timeoutId = setTimeout(() => {
      timeoutId = null
      if (this._correlationIdMap.has(correlationId)) {
        this._correlationIdMap.delete(correlationId)

        reject(new Error(`QUEUE GATHERING RESPONSE TIMED OUT '${this.name}' ${correlationId}`))
      }
    }, timeoutMs || this._rpcTimeoutMs)

    return correlationId
  }
}

module.exports = GatheringClient
