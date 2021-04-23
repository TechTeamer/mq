const QueueMessage = require('./QueueMessage')
const QueueResponse = require('./QueueResponse')

class GatheringServer {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} exchange
   * @param {Object} options
   */
  constructor (queueConnection, logger, exchange, options) {
    this._connection = queueConnection
    this._logger = logger
    this.name = exchange

    const { timeoutMs } = options || {}
    this._responseTimeoutMs = timeoutMs

    this.actions = new Map()
  }

  async initialize () {
    try {
      const channel = await this._connection.getChannel()
      await channel.assertExchange(this.name, 'fanout', { durable: true })
      const serverQueue = await channel.assertQueue('', { exclusive: true })

      await channel.bindQueue(serverQueue.queue, this.name, '')

      await channel.consume(serverQueue.queue, (msg) => {
        this._handleGatheringAnnouncement(channel, msg).catch(() => {
          // this should not throw
        })
      }, { noAck: true })
    } catch (err) {
      this._logger.error('CANNOT INITIALIZE QUEUE GATHERING SERVER', err)
    }
  }

  /**
   * @param {*} msg
   * @param {QueueMessage} request
   * @param {QueueResponse} response
   * @protected
   * @returns {Promise}
   */
  async _callback (msg, request, response) {
    const {
      action,
      data
    } = msg || {}
    if (!this.actions.has(action)) {
      return Promise.resolve()
    }

    const handler = this.actions.get(action)

    return handler.call(this, data, request, response)
  }

  /**
   * @param {string} action
   * @param {Function} handler
   */
  registerAction (action, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(`${typeof handler} is not a Function`)
    } else if (this.actions.has(action)) {
      this._logger.warn(`Actions-handlers map already contains an action named ${action}`)
    } else {
      this.actions.set(action, handler)
    }
  }

  /**
   * @param {Function} cb
   */
  consume (cb) {
    this._callback = cb
  }

  /**
   * @param channel
   * @param msg
   * @return {Promise}
   * @private
   */
  async _handleGatheringAnnouncement (channel, msg) {
    if (!msg || !msg.properties) {
      this._logger.error(`QUEUE GATHERING SERVER: INVALID REQUEST ON '${this.name}': NO MESSAGE/PROPERTIES`, msg)
      this._nack(channel, msg)
      return
    }
    if (!msg.properties.correlationId) {
      this._logger.error(`QUEUE GATHERING SERVER: INVALID REQUEST ON '${this.name}': NO CORRELATION ID`, msg)
      this._nack(channel, msg)
      return
    }
    if (!msg.properties.replyTo) {
      this._logger.error(`QUEUE GATHERING SERVER: INVALID REQUEST ON '${this.name}': NO REPLY TO`, msg)
      this._nack(channel, msg)
      return
    }

    const correlationId = msg.properties.correlationId
    const replyTo = msg.properties.replyTo
    let request

    try {
      request = QueueMessage.unserialize(msg.content)
      if (request.status !== 'ok') {
        this._logger.error(`QUEUE GATHERING SERVER: MESSAGE NOT OK '${this.name}' ${correlationId}`, request)
        this._nack(channel, msg)
        return
      }
    } catch (err) {
      this._logger.error(`QUEUE GATHERING SERVER: MALFORMED MESSAGE '${this.name}' ${correlationId}`, err)
      this._nack(channel, msg)
      return
    }

    let responseTimedOut = false
    const response = new QueueResponse()
    const timeoutMs = typeof request.timeOut === 'number' ? request.timeOut : this._responseTimeoutMs
    const timerId = setTimeout(() => {
      responseTimedOut = true
      this._logger.error(`QUEUE GATHERING SERVER: RESPONSE TIMED OUT '${this.name}' ${correlationId}`)
      this._nack(channel, msg)
    }, timeoutMs)

    let answer
    try {
      answer = await this._callback(request.data, request, response)
    } catch (err) {
      this._logger.error(`QUEUE GATHERING SERVER: response failed '${this.name}' ${correlationId}`)
      this._nack(channel, msg)
      return
    }

    if (responseTimedOut) {
      return
    }

    clearTimeout(timerId)

    if (!response.statusCode && typeof answer !== 'undefined') {
      // implicit status
      response.setStatus(response.OK)
    }

    let reply
    try {
      if (response.statusCode === response.OK) {
        const replyAttachments = response.getAttachments()
        reply = new QueueMessage('ok', answer)
        if (replyAttachments instanceof Map) {
          for (const [key, value] of replyAttachments) {
            reply.addAttachment(key, value)
          }
        }
      } else if (response.statusCode === response.NOT_FOUND) {
        this._nack(channel, msg)
      } else if (response.statusCode === response.ERROR) {
        reply = new QueueMessage('error', response.statusMessage)
      }
    } catch (err) {
      this._logger.error('QUEUE GATHERING SERVER: Failed to construct reply', this.name, err)
    }

    try {
      channel.sendToQueue(replyTo, reply.serialize(), { correlationId: correlationId })
      // this._ack(channel, msg)
    } catch (err) {
      this._logger.error('QUEUE GATHERING SERVER: Failed to send reply', this.name, err)
    }
  }

  /**
   * @param ch
   * @param msg
   * @private
   */
  _ack (ch, msg) {
    if (msg.acked) {
      this._logger.error('trying to double ack', msg)
      return
    }
    ch.ack(msg)
    msg.acked = true
  }

  /**
   * @param channel
   * @param msg
   * @param [requeue=true]
   * @private
   */
  _nack (channel, msg, requeue = true) {
    if (msg.acked) {
      this._logger.error('trying to double nack', msg)
      return
    }
    channel.nack(msg, false, requeue)
    msg.acked = true
  }
}

module.exports = GatheringServer
