const Publisher = require('./Publisher')

class QueueClient extends Publisher {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} name
   * @param {Object} options
   */
  constructor (queueConnection, logger, name, options) {
    super(queueConnection, logger, '', options)
    this.routingKey = name
    this._assertQueue = null
    const {
      assertQueue = true,
      assertQueueOptions
    } = options || {}

    this._assertQueue = assertQueue === true
    if (this._assertQueue) {
      this._assertQueueOptions = Object.assign(assertQueueOptions || {}, { durable: true })
    }
  }

  /**
   * @param channel
   * @returns {Promise}
   */
  assertExchangeOrQueue (channel) {
    if (this._assertQueue) {
      return channel.assertQueue(this.routingKey, this._assertQueueOptions)
    }
  }
}

module.exports = QueueClient
