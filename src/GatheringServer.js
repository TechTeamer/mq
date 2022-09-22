const QueueMessage = require('./QueueMessage')
const QueueResponse = require('./QueueResponse')

class GatheringServer {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} name
   * @param {Object} options
   */
  constructor (queueConnection, logger, name, options) {
    this._connection = queueConnection
    this._logger = logger
    this.name = name
    this.statusQueue = name

    const {
      prefetchCount,
      timeoutMs,
      assertQueueOptions,
      assertExchange = true,
      assertExchangeOptions = null
    } = options || {}

    this._prefetchCount = prefetchCount
    this._responseTimeoutMs = timeoutMs

    this._assertExchange = assertExchange === true
    this._assertQueueOptions = Object.assign({ exclusive: true, autoDelete: true }, assertQueueOptions || {})
    this._assertExchangeOptions = Object.assign({ durable: true }, assertExchangeOptions || {})

    this.actions = new Map()
  }

  async initialize () {
    try {
      const channel = await this._connection.getChannel()
      if (this._assertExchange) {
        await channel.assertExchange(this.name, 'fanout', this._assertExchangeOptions)
      }
      const serverQueue = await channel.assertQueue('', this._assertQueueOptions)
      const serverQueueName = serverQueue.queue

      await channel.prefetch(this._prefetchCount)
      await channel.bindQueue(serverQueueName, this.name, '')

      await channel.consume(serverQueueName, (msg) => {
        this._handleGatheringAnnouncement(channel, msg).catch(() => {
          // this should not throw
        })
      })

      await channel.assertQueue(this.statusQueue, {
        exclusive: false,
        autoDelete: true
      })
      await channel.consume(this.statusQueue, () => {
        // noop
      }, { noAck: true })
    } catch (err) {
      this._logger.error('CANNOT INITIALIZE QUEUE GATHERING SERVER', this.name, err)
      throw new Error('Error initializing Gathering Server')
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
      response.notFound(`No action handler for ${action}`)
      return
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
        this._sendStatus(channel, replyTo, correlationId, 'error', 'message not OK')
        this._nack(channel, msg)
        return
      }
    } catch (err) {
      this._logger.error(`QUEUE GATHERING SERVER: MALFORMED MESSAGE '${this.name}' ${correlationId}`, err)
      this._sendStatus(channel, replyTo, correlationId, 'error', 'malformed message')
      this._nack(channel, msg)
      return
    }

    let responseTimedOut = false
    const response = new QueueResponse()
    const timeoutMs = typeof request.timeOut === 'number' ? request.timeOut : this._responseTimeoutMs
    const timerId = setTimeout(() => {
      responseTimedOut = true
      this._logger.error(`QUEUE GATHERING SERVER: RESPONSE TIMED OUT '${this.name}' ${correlationId}`)
      this._sendStatus(channel, replyTo, correlationId, 'ok', 'response timed out')
      this._nack(channel, msg)
    }, timeoutMs)

    let answer
    try {
      answer = await this._callback(request.data, request, response)
    } catch (err) {
      this._logger.error(`QUEUE GATHERING SERVER: response failed '${this.name}' ${correlationId}`)
      this._sendStatus(channel, replyTo, correlationId, 'error', 'response failed')
      this._nack(channel, msg)
      return
    }

    if (responseTimedOut) {
      return
    }

    clearTimeout(timerId)

    if (!response.statusCode) {
      // implicit status
      if (typeof answer === 'undefined') {
        response.setStatus(response.NOT_FOUND)
      } else {
        response.setStatus(response.OK)
      }
    }

    let reply
    try {
      if (response.statusCode === response.OK) {
        const replyAttachments = response.getAttachments()
        const queueMessage = new QueueMessage('ok', answer)
        if (replyAttachments instanceof Map) {
          for (const [key, value] of replyAttachments) {
            queueMessage.addAttachment(key, value)
          }
        }
        reply = queueMessage.serialize()
      } else if (response.statusCode === response.NOT_FOUND) {
        this._sendStatus(channel, replyTo, correlationId, 'ok', 'not found')
        this._nack(channel, msg)
        return
      } else if (response.statusCode === response.ERROR) {
        const queueMessage = new QueueMessage('error', response.statusMessage)
        reply = queueMessage.serialize()
      }
    } catch (err) {
      this._logger.error('QUEUE GATHERING SERVER: Failed to construct reply', this.name, err)
      this._sendStatus(channel, replyTo, correlationId, 'error', 'failed to construct reply')
      this._nack(channel, msg)
      return
    }

    try {
      channel.sendToQueue(replyTo, reply, { correlationId, type: 'reply' })
      this._ack(channel, msg)
    } catch (err) {
      this._logger.error('QUEUE GATHERING SERVER: Failed to send reply', this.name, err)
    }
  }

  _sendStatus (channel, replyTo, correlationId, status, message = '') {
    const reply = new QueueMessage(status, message)
    channel.sendToQueue(replyTo, reply.serialize(), { correlationId, type: 'status' })
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
  _nack (channel, msg, requeue = false) {
    if (msg.acked) {
      this._logger.error('trying to double nack', msg)
      return
    }
    channel.nack(msg, false, requeue)
    msg.acked = true
  }
}

module.exports = GatheringServer
