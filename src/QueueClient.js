const Publisher = require('./Publisher')

class QueueClient extends Publisher {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} name
   */
  constructor (queueConnection, logger, name) {
    super(queueConnection, logger, '')
    this.routingKey = name
  }

  /**
   * @param channel
   * @returns {Promise}
   */
  assertExchangeOrQueue (channel) {
    return channel.assertQueue(this.routingKey, {durable: true})
  }
}

module.exports = QueueClient
