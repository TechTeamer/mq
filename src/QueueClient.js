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
      assertQueue
    } = options || {}

    if (assertQueue) {
      this._assertQueue = assertQueue === true
        ? { durable: true } // defaults
        : assertQueue
    }
  }

  /**
   * @param channel
   * @returns {Promise}
   */
  assertExchangeOrQueue (channel) {
    if (this._assertQueue) {
      return channel.assertQueue(this.routingKey, this._assertQueue)
    }
  }
}

module.exports = QueueClient
