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
    this._assertQueueOptions = null
    this._prefetchCount = options.prefetchCount
    if (options.assertQueueOptions) {
      this._assertQueueOptions = options.assertQueueOptions === true
        ? { durable: true }
        : options.assertQueueOptions
    }
  }

  /**
   * @return {Promise}
   */
  async initialize () {
    try {
      const channel = await this._connection.getChannel()
      if (this._assertQueueOptions) {
        await channel.assertQueue(this.name, this._assertQueueOptions)
      }
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
