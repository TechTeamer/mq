const QueueMessage = require('./QueueMessage')

class Publisher {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} exchange
   */
  constructor (queueConnection, logger, exchange) {
    this._connection = queueConnection
    this._logger = logger
    this.exchange = exchange
    this.routingKey = ''
  }

  /**
   * Overridden in queueClient to assertQueue instead of exchange
   *
   * @param channel
   * @returns {Promise}
   */
  assertExchangeOrQueue (channel) {
    return channel.assertExchange(this.exchange, 'fanout', {durable: true})
  }

  /**
   * @param {String} message
   * @param {String} correlationId
   * @return {Promise}
   */
  send (message, correlationId) {
    let options = {}
    let channel

    if (correlationId) {
      options.correlationId = correlationId
    }

    return this._connection.getChannel().then((ch) => {
      channel = ch
      return this.assertExchangeOrQueue(channel)
    }).then(() => {
      let param
      try {
        param = new QueueMessage('ok', message).serialize()
      } catch (err) {
        this._logger.error('CANNOT PUBLISH MESSAGE', this.exchange, err)
        throw err
      }

      return new Promise((resolve, reject) => {
        let isWriteBufferEmpty = channel.publish(this.exchange, this.routingKey, param, options, (err, ok) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })

        if (!isWriteBufferEmpty) { // http://www.squaremobius.net/amqp.node/channel_api.html#channel_publish
          channel.on('drain', resolve)
        }
      })
    }).catch((err) => {
      this._logger.error('PUBLISHER: cannot get channel', err)
      throw err
    })
  }
}

module.exports = Publisher
