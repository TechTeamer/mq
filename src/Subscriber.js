const QueueMessage = require('./QueueMessage')

class Subscriber {
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

    const { maxRetry, timeoutMs } = options
    this._maxRetry = maxRetry
    this._timeoutMs = timeoutMs

    this._retryMap = new Map()

    this.actions = new Map()
  }

  _callback (msg, properties, request) {
    const { action, data } = msg || {}
    if (!this.actions.has(action)) {
      return Promise.resolve()
    }

    const handler = this.actions.get(action)
    return Promise.resolve().then(() => handler.call(this, data, properties, request))
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
      await channel.assertExchange(this.name, 'fanout', { durable: true })
      const queue = await channel.assertQueue('', { exclusive: true })

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

  /**
   * @param channel
   * @param msg
   * @return {Promise}
   * @private
   */
  _processMessage (channel, msg) {
    const request = QueueMessage.unserialize(msg.content)
    if (request.status !== 'ok') {
      this._logger.error('CANNOT GET QUEUE MESSAGE PARAMS', this.name, request)
      this._ack(channel, msg)
      return
    }

    if (msg.fields && msg.fields.redelivered && msg.fields.consumerTag) {
      let counter = 1
      if (this._retryMap.has(msg.fields.consumerTag)) {
        counter = this._retryMap.get(msg.fields.consumerTag) + 1
        this._retryMap.set(msg.fields.consumerTag, counter)
      } else {
        this._retryMap.set(msg.fields.consumerTag, counter)
      }

      if (counter > this._maxRetry) {
        this._logger.error('SUBSCRIBER TRIED TOO MANY TIMES', this.name, request, msg)
        this._ack(channel, msg)
        if (msg.fields.consumerTag) {
          this._retryMap.delete(msg.fields.consumerTag)
        }
        return
      }
    }

    let timedOut = false
    const timeoutMs = typeof request.timeOut === 'number' ? request.timeOut : this._timeoutMs
    const timer = setTimeout(() => {
      timedOut = true
      this._logger.error('Timeout in Subscriber', this.name, request.data)
      this._nack(channel, msg)
    }, timeoutMs)

    return Promise.resolve().then(() => {
      return this._callback(request.data, msg.properties, request)
    }).then(() => {
      if (!timedOut) {
        clearTimeout(timer)
        this._ack(channel, msg)
        if (msg.fields && msg.fields.redelivered && msg.fields.consumerTag) {
          this._retryMap.delete(msg.fields.consumerTag)
        }
      }
    }).catch((err) => {
      if (!timedOut) {
        clearTimeout(timer)
        this._logger.error('Cannot process Subscriber consume', err)
        this._nack(channel, msg)
      }
    })
  }

  /**
   * @param {Function} cb
   */
  consume (cb) {
    this._callback = cb
  }
}

module.exports = Subscriber
