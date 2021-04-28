const { v4: uuid } = require('uuid')
const QueueMessage = require('./QueueMessage')

class GatheringClient {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} name
   * @param {Object} [options]
   */
  constructor (queueConnection, logger, name, options = {}) {
    this._connection = queueConnection
    this._logger = logger
    this.name = name
    this.statusQueue = name

    this._correlationIdMap = new Map()
    this._replyQueue = ''

    const { queueMaxSize, timeoutMs, serverCount = 0 } = options
    this._rpcQueueMaxSize = queueMaxSize
    this._rpcTimeoutMs = timeoutMs
    this._gatheringServerCount = serverCount
  }

  async initialize () {
    try {
      const channel = await this._connection.getChannel()
      await channel.assertExchange(this.name, 'fanout', { durable: true })

      const replyQueue = await channel.assertQueue('', { exclusive: true })
      this._replyQueue = replyQueue.queue

      await channel.consume(this._replyQueue, (reply) => {
        if (!reply) {
          this._logger.error(`QUEUE GATHERING CLIENT: INVALID REPLY ON '${this.name}': NO REPLY`, reply)
          return
        }
        if (!reply.properties) {
          this._logger.error(`QUEUE GATHERING CLIENT: INVALID REPLY ON '${this.name}': NO PROPERTIES ON REPLY`, reply)
          return
        }
        if (!reply.properties.correlationId) {
          this._logger.error(`QUEUE GATHERING CLIENT: INVALID REPLY ON '${this.name}': NO CORRELATION ID ON REPLY`, reply)
          return
        }

        if (reply.properties.type === 'status') {
          this._handleStatusResponse(reply)
        } else {
          this._handleGatheringResponse(reply)
        }
      }, { noAck: true })

      // await channel.assertQueue(this.statusQueue, { exclusive: false, autoDelete: true })
      // await channel.consume(this.statusQueue, (reply) => {
      //   this._handleStatusResponse(reply)
      // }, { noAck: true })
    } catch (err) {
      this._logger.error(`QUEUE GATHERING CLIENT: Error initializing '${this.name}'`)
      throw new Error('Error initializing Gathering Client')
    }
  }

  /**
   * @param {*} data
   * @param {Number} timeoutMs
   * @param {Map} attachments
   * @param {Boolean} [resolveWithFullResponse=false]
   * @param {Boolean} [acceptNotFound=true]
   * @return {Promise<QueueMessage|*>}
   * */
  async request (data, timeoutMs = null, attachments = null, resolveWithFullResponse = false, acceptNotFound = true) {
    if (this._correlationIdMap.size > this._rpcQueueMaxSize) {
      throw new Error(`QUEUE GATHERING CLIENT: REQUEST LIMIT REACHED '${this.name}'`)
    }

    const channel = await this._connection.getChannel()
    const statusQueue = await channel.assertQueue(this.statusQueue, {
      exclusive: false,
      autoDelete: true
    })
    const serverCount = statusQueue.consumerCount

    const param = new QueueMessage('ok', data, timeoutMs)
    if (attachments instanceof Map) {
      for (const [key, value] of attachments) {
        param.addAttachment(key, value)
      }
    }

    return new Promise((resolve, reject) => {
      const correlationId = this._registerMessage(resolve, reject, timeoutMs, resolveWithFullResponse, acceptNotFound, serverCount)
      const options = {
        correlationId: correlationId,
        replyTo: this._replyQueue
      }

      try {
        const isWriteBufferEmpty = channel.publish(this.name, '', param.serialize(), options, (err) => {
          if (err) {
            if (this._correlationIdMap.has(correlationId)) {
              this._correlationIdMap.delete(correlationId)
            }
            this._logger.error('QUEUE GATHERING CLIENT: failed to publish message', err)
            reject(new Error('channel.publish failed'))
          }
        })

        if (!isWriteBufferEmpty) { // http://www.squaremobius.net/amqp.node/channel_api.html#channel_publish
          channel.on('drain', resolve)
        }
      } catch (err) {
        if (this._correlationIdMap.has(correlationId)) {
          this._correlationIdMap.delete(correlationId)
        }
        this._logger.error('QUEUE GATHERING CLIENT: failed to send message', err)
        reject(err)
      }
    })
  }

  /**
   * @param {Function} resolve
   * @param {Function} reject
   * @param {Number} timeoutMs
   * @param {boolean} resolveWithFullResponse
   * @param {boolean} acceptNotFound
   * @param {Number} serverCount
   * @return {Number} correlation id
   * @private
   */
  _registerMessage (resolve, reject, timeoutMs, resolveWithFullResponse, acceptNotFound, serverCount) {
    let correlationId
    let timeoutId
    let timedOut = false

    do {
      correlationId = uuid()
    } while (this._correlationIdMap.has(correlationId))

    this._correlationIdMap.set(correlationId, {
      resolveWithFullResponse: resolveWithFullResponse,
      acceptNotFound: acceptNotFound,
      serverCount: serverCount || this._gatheringServerCount,
      responseCount: 0,
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
        const requestData = this._correlationIdMap.get(correlationId)
        const { serverCount, responseCount } = requestData || {}
        this._correlationIdMap.delete(correlationId)

        reject(new Error(`QUEUE GATHERING RESPONSE TIMED OUT '${this.name}' ${correlationId} ${responseCount}/${serverCount}`))
      }
    }, timeoutMs || this._rpcTimeoutMs)

    return correlationId
  }

  _handleGatheringResponse (reply) {
    const correlationId = reply.properties.correlationId

    if (!this._correlationIdMap.has(correlationId)) {
      this._logger.warn(`QUEUE GATHERING CLIENT: RECEIVED UNKNOWN REPLY (possibly timed out) '${this.name}'`, correlationId)
      return
    }

    const requestData = this._correlationIdMap.get(correlationId)
    const { resolve, reject, resolveWithFullResponse } = requestData || {}

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

  _handleStatusResponse (reply) {
    const correlationId = reply.properties.correlationId

    if (!this._correlationIdMap.has(correlationId)) {
      return
    }

    const requestData = this._correlationIdMap.get(correlationId)
    const { resolve, reject, acceptNotFound, serverCount, responseCount } = requestData || {}

    requestData.responseCount++
    this._correlationIdMap.set(correlationId, requestData)

    if (requestData.responseCount >= serverCount) {
      this._correlationIdMap.delete(correlationId)
      if (acceptNotFound) {
        resolve()
      } else {
        reject(new Error(`Gathering failed: resource not found ${responseCount}/${serverCount}`))
      }
    }
  }
}

module.exports = GatheringClient
