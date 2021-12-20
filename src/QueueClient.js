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
  }

  /**
   * @param channel
   * @returns {Promise}
   */
  assertExchangeOrQueue (channel) {
    return channel.assertQueue(this.routingKey, { durable: true })
  }
}

module.exports = QueueClient
