const QueueMessage = require('./QueueMessage')

class Publisher {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} name
   */
  constructor (queueConnection, logger, name) {
    this._connection = queueConnection
    this._logger = logger
    this.name = name
  }

  /**
   * @param {String} message
   * @param {String} correlationId
   * @return {Promise}
   */
  send (message, correlationId) {
    let options = {}
    let channel
    let param

    if (correlationId) {
      options.correlationId = correlationId
    }

    try {
      param = JSON.stringify(new QueueMessage('ok', message))
    } catch (err) {
      this._logger.error('CANNOT PUBLISH MESSAGE %s #%s', this.name, err)
      throw err
    }

    return this._connection.getChannel().then((ch) => {
      channel = ch
      return channel.assertExchange(this.name, 'fanout', {durable: false})
    }).then(() => {
      let isResolved = false

      return new Promise((resolve, reject) => {
        let callResolve = () => {
          if (!isResolved) {
            isResolved = true
            resolve()
          }
        }

        let isWriteBufferEmpty = channel.publish(this.name, Buffer.from(param), options, (err, ok) => {
          if (err) {
            reject(err)
          } else {
            callResolve()
          }
        })

        if (!isWriteBufferEmpty) { // http://www.squaremobius.net/amqp.node/channel_api.html#channel_publish
          channel.on('drain', callResolve)
        }
      })
    }).catch((err) => {
      this._logger.error('PUBLISHER: cannot get channel', err)
      throw err
    })
  }
}

module.exports = Publisher
