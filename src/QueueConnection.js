const fs = require('fs')
const amqp = require('amqplib/channel_api')
const QueueConfig = require('./QueueConfig')

/**
 * @class QueueConnection
 * */
class QueueConnection {
  /**
   * @param {QueueConfig} config
   */
  constructor (config) {
    this._config = new QueueConfig(config)
    this._connection = null
    this._connectionPromise = null
    this._channel = null
    this._channelPromise = null
  }

  /**
   * @return Promise
   * */
  connect () {
    if (this._connection) {
      return Promise.resolve(this._connection)
    } else if (this._connectionPromise) {
      return this._connectionPromise
    }

    let options = Object.assign({}, this._config.options)
    if (options.cert) {
      options.cert = fs.readFileSync(options.cert)
    }
    if (options.key) {
      options.key = fs.readFileSync(options.key)
    }
    if (options.ca) {
      options.ca = options.ca.map((ca) => fs.readFileSync(ca))
    }

    this._connectionPromise = amqp.connect(this._config.url, options).then(function (conn) {
      this._config.logger.info('RabbitMQ connection established')

      conn.on('error', (err) => {
        if (err.message !== 'Connection closing') {
          this._config.logger.warn('RabbitMQ error', err)
        }
      })
      conn.on('close', () => {
        this._config.logger.error('RabbitMQ closed')
        process.exit(2)
      })
      conn.on('blocked', (reason) => {
        this._config.logger.warn('RabbitMQ blocked', reason)
      })
      conn.on('unblocked', (reason) => {
        this._config.logger.warn('RabbitMQ unblocked', reason)
      })

      this._connection = conn
      return conn
    }).catch(function (err) {
      this._config.logger.error(err)

      throw err
    })

    return this._connectionPromise
  }

  /**
   * @return Promise
   * */
  getChannel () {
    if (this._channel) {
      return Promise.resolve(this._channel)
    } else if (this._channelPromise) {
      return this._channelPromise
    }

    this._channelPromise = this.connect().then((connection) => {
      return connection.createConfirmChannel()
    }).then(function (channel) {
      this._channel = channel
      return channel
    }).catch(function (err) {
      this._config.logger.error(err)
      throw err
    })

    return this._channelPromise
  }
}

module.exports = QueueConnection
