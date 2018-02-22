const QueueMessage = require('./QueueMessage')

class Subscriber {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} name
   * @param {Number} maxRetry
   * @param {Number} timeoutMs
   */
  constructor (queueConnection, logger, name, maxRetry, timeoutMs) {
    this._connection = queueConnection
    this._logger = logger
    this.name = name
    this._maxRetry = maxRetry
    this._retryMap = new Map()
    this._timeoutMs = timeoutMs

    this._callback = () => Promise.resolve()
  }

  /**
   * @return {Promise}
   */
  initialize () {
    let channel
    let queue

    return this._connection.getChannel().then(c => {
      channel = c
      return channel.assertExchange(this.name, 'fanout', {durable: true})
    }).then(() => {
      return channel.assertQueue('', {exclusive: true})
    }).then(q => {
      queue = q
      return channel.bindQueue(queue.queue, this.name, '')
    }).then(() => {
      return channel.consume(queue.queue, (msg) => {
        this._processMessage(channel, msg)
      })
    }).catch(err => {
      this._logger.error('CANNOT INITIALIZE SUBSCRIBER', err)
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

module.exports = Subscriber
