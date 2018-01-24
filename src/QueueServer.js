const QueueMessage = require('./QueueMessage')

class QueueServer {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} name
   * @param {Number} prefetchCount
   * @param {Number} maxRetry
   * @param {Number} timeoutMs
   */
  constructor (queueConnection, logger, name, prefetchCount, maxRetry, timeoutMs) {
    this._connection = queueConnection
    this._logger = logger
    this.name = name
    this._prefetchCount = prefetchCount
    this._maxRetry = maxRetry
    this._retryMap = new Map()
    this._timeoutMs = timeoutMs

    this._callback = () => Promise.resolve()

    this.initialize()
  }

  /**
   * @return {Promise}
   */
  initialize () {
    return this._connection.getChannel().then((channel) => {
      return channel.assertQueue(this.name, {durable: true}).then(() => {
        return channel.prefetch(this._prefetchCount)
      }).then(() => {
        return channel.consume(this.name, (msg) => {
          this._processMessage(channel, msg)
        })
      })
    }).catch((err) => {
      this._logger.error('CANNOT CREATE RPC SERVER CHANNEL', err)
    })
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
    let request = QueueMessage.fromJSON(msg.content)
    if (request.status !== 'ok') {
      this._logger.error('CANNOT GET QUEUE MESSAGE PARAMS %s #%s', this.name, request)
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
        this._logger.error('QUEUESERVER TRIED TOO MANY TIMES', this.name, request, msg)
        this._ack(channel, msg)
        if (msg.fields.consumerTag) {
          this._retryMap.delete(msg.fields.consumerTag)
        }
        return
      }
    }

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      this._logger.error('Timeout in QueueServer', this.name, request.data)
      this._nack(channel, msg)
    }, this._timeoutMs)

    return Promise.resolve().then(() => {
      return this._callback(request.data, msg.properties)
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
        this._logger.error('Cannot process QueueServer consume', err)
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

module.exports = QueueServer
