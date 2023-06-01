const QueueMessage = require('./QueueMessage')

class Subscriber {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} name
   * @param {Object} options
   */
  constructor (queueConnection, logger, name, options = {}) {
    this._connection = queueConnection
    this._logger = logger
    this.name = name

    const {
      maxRetry,
      timeoutMs,
      MessageModel = QueueMessage,
      ContentSchema = JSON,
      assertQueueOptions = {},
      assertExchange = true,
      assertExchangeOptions = {}
    } = options

    this._maxRetry = maxRetry
    this._timeoutMs = timeoutMs
    this.MessageModel = MessageModel
    this.ContentSchema = ContentSchema

    this._assertQueueOptions = Object.assign({ exclusive: true, autoDelete: true }, assertQueueOptions)
    this._assertExchange = assertExchange === true
    this._assertExchangeOptions = Object.assign({ durable: true }, assertExchangeOptions)

    this._retryMap = new Map()

    this.actions = new Map()
  }

  _callback (body, properties, request, msg) {
    const { action, data } = body || {}
    if (!this.actions.has(action)) {
      return Promise.resolve()
    }

    const handler = this.actions.get(action)
    return Promise.resolve().then(() => handler.call(this, data, properties, request, msg))
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
   * @return {Promise}
   */
  async initialize () {
    try {
      const channel = await this._connection.getChannel()
      if (this._assertExchange) {
        await channel.assertExchange(this.name, 'fanout', this._assertExchangeOptions)
      }
      const queue = await channel.assertQueue('', this._assertQueueOptions)

      await channel.bindQueue(queue.queue, this.name, '')

      await channel.consume(queue.queue, (msg) => {
        this._processMessage(channel, msg)
      })
    } catch (err) {
      this._logger.error('CANNOT INITIALIZE SUBSCRIBER', err)
    }
  }

  /**
   * @param channel
   * @param msg
   * @private
   */
  _ack (channel, msg) {
    if (msg.acked) {
      this._logger.error('trying to double ack', msg)
      return
    }
    channel.ack(msg)
    msg.acked = true
  }

  /**
   * @param channel
   * @param msg
   * @private
   */
  _nack (channel, msg) {
    if (msg.acked) {
      this._logger.error('trying to double nack', msg)
      return
    }
    channel.nack(msg)
    msg.acked = true
  }

  _parseMessage (msg) {
    try {
      const request = this.MessageModel.unserialize(msg.content, this.ContentSchema)

      if (request.status !== 'ok') {
        this._logger.error('CANNOT GET QUEUE MESSAGE PARAMS', this.name)
        return null
      }

      return request
    } catch (err) {
      this._logger.error('CANNOT PROCESS QUEUE MESSAGE', this.name, msg.properties, err)
      return null
    }
  }

  /**
   * @param channel
   * @param msg
   * @param request
   * @returns {boolean} true if too many retries reached
   * @private
   */
  _handleMessageRetry (msg, request) {
    if (!msg.fields || !msg.fields.redelivered || !msg.fields.consumerTag) {
      return false
    }

    const consumerTag = msg.fields.consumerTag
    let counter = 1
    if (this._retryMap.has(consumerTag)) {
      counter = this._retryMap.get(consumerTag) + 1
      this._retryMap.set(consumerTag, counter)
    } else {
      this._retryMap.set(consumerTag, counter)
    }

    if (counter > this._maxRetry) {
      this._logger.error('SUBSCRIBER TRIED TOO MANY TIMES', this.name, msg)
      this._retryMap.delete(consumerTag)
      return true
    }

    return false
  }

  /**
   * @param channel
   * @param msg
   * @return {Promise}
   * @protected
   */
  async _processMessage (channel, msg) {
    const request = this._parseMessage(msg)
    if (!request) {
      this._ack(channel, msg)
      return
    }

    const tooManyRetries = this._handleMessageRetry(msg, request)
    if (tooManyRetries) {
      this._ack(channel, msg)
      return
    }

    let timedOut = false
    const timeoutMs = typeof request.timeOut === 'number' ? request.timeOut : this._timeoutMs
    const timer = setTimeout(() => {
      timedOut = true
      this._logger.error('Timeout in Subscriber', this.name)
      this._nack(channel, msg)
    }, timeoutMs)

    try {
      await this._callback(request.data, msg.properties, request, msg)

      if (!timedOut) {
        clearTimeout(timer)
        this._ack(channel, msg)
        if (msg.fields && msg.fields.redelivered && msg.fields.consumerTag) {
          this._retryMap.delete(msg.fields.consumerTag)
        }
      }
    } catch (err) {
      if (!timedOut) {
        clearTimeout(timer)
        this._logger.error('Cannot process Subscriber consume', err)
        this._nack(channel, msg)
      }
    }
  }

  /**
   * @param {Function} cb
   */
  consume (cb) {
    this._callback = cb
  }
}

module.exports = Subscriber
