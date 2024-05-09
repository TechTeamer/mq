const Subscriber = require('./Subscriber')

class QueueServer extends Subscriber {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} name
   * @param {Object} options
   */
  constructor (queueConnection, logger, name, options = {}) {
    super(queueConnection, logger, name, options)
    const {
      assertQueue = true,
      assertQueueOptions = {},
      prefetchCount
    } = options

    this._assertQueue = null
    this._prefetchCount = prefetchCount

    this._assertQueue = assertQueue === true
    this._assertQueueOptions = Object.assign({ durable: true }, assertQueueOptions)
  }

  /**
   * @return {Promise}
   */
  async initialize () {
    try {
      const channel = await this._connection.getChannel()
      if (this._assertQueue) {
        await channel.assertQueue(this.name, this._assertQueueOptions)
      }
      await channel.prefetch(this._prefetchCount)
      await channel.consume(this.name, (msg) => {
        this._processMessage(channel, msg)
      })
    } catch (err) {
      this._logger.error('CANNOT INITIALIZE QUEUE SERVER', this.name, this._assertQueueOptions, err)
      throw err
    }
  }
}

module.exports = QueueServer
