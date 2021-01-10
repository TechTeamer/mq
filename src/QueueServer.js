const Subscriber = require('./Subscriber')

class QueueServer extends Subscriber {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} name
   * @param {Object} options
   */
  constructor (queueConnection, logger, name, options) {
    super(queueConnection, logger, name, options)
    this._prefetchCount = options.prefetchCount
  }

  /**
   * @return {Promise}
   */
  async initialize () {
    try {
      const channel = await this._connection.getChannel()
      await channel.assertQueue(this.name, { durable: true })
      await channel.prefetch(this._prefetchCount)
      await channel.consume(this.name, (msg) => {
        this._processMessage(channel, msg)
      })
    } catch (err) {
      this._logger.error('CANNOT INITIALIZE QUEUE SERVER', err)
      throw err
    }
  }
}

module.exports = QueueServer
