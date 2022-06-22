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
    const {
      assertQueue = true,
      prefetchCount
    } = options || {}

    this._assertQueue = null
    this._prefetchCount = prefetchCount

    if (assertQueue) {
      this._assertQueue = assertQueue === true
        ? { durable: true } // defaults
        : assertQueue
    }
  }

  /**
   * @return {Promise}
   */
  async initialize () {
    try {
      const channel = await this._connection.getChannel()
      if (this._assertQueue) {
        await channel.assertQueue(this.name, this._assertQueue)
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
