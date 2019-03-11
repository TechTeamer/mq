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
    this._prefetchCount = options.prefetchCount
  }

  /**
   * @return {Promise}
   */
  initialize () {
    if (this._initializePromise) {
      return this._initializePromise
    }

    this._initializePromise = this._connection.getChannel().then((channel) => {
      return channel.assertQueue(this.name, { durable: true }).then(() => {
        return channel.prefetch(this._prefetchCount)
      }).then(() => {
        return channel.consume(this.name, (msg) => {
          this._processMessage(channel, msg)
        })
      })
    }).catch((err) => {
      this._logger.error('CANNOT INITIALIZE QUEUE SERVER', err)
    })

    return this._initializePromise
  }
}

module.exports = QueueServer
