const fs = require('fs')
const amqp = require('amqplib/channel_api')
const QueueConfig = require('./QueueConfig')
const EventEmitter = require('events')
const URL = require('node:url').URL

/**
 * @class QueueConnection
 * */
class QueueConnection extends EventEmitter {
  /**
   * @param {QueueConfig} config
   */
  constructor (config) {
    super()
    this._config = new QueueConfig(config)
    this._logger = this._config.logger
    this._connection = null
    this._connectionPromise = null
    this._channel = null
    this._channelPromise = null
    this._activeConnectionUrl = null
  }

  setLogger (logger) {
    this._logger = logger
  }

  /**
   * @return Promise<amqplib.Connection>
   * */
  connect () {
    if (this._connection) {
      return Promise.resolve(this._connection)
    } else if (this._connectionPromise) {
      return this._connectionPromise
    }

    const options = Object.assign({}, this._config.options)
    if (options.cert) {
      options.cert = fs.readFileSync(options.cert)
    }
    if (options.key) {
      options.key = fs.readFileSync(options.key)
    }
    if (options.ca) {
      options.ca = options.ca.map((ca) => fs.readFileSync(ca))
    }

    this._connectionPromise = this._connect(this._config.url, options).then((conn) => {
      const urlObject = new URL(this._activeConnectionUrl)
      this._logger.info(`RabbitMQ connection established on '${urlObject.host}' host`)

      conn.on('error', (err) => {
        if (err.message !== 'Connection closing') {
          this._logger.error('RabbitMQ error', err)
          this.emit('error', err)
        }
      })
      conn.on('close', (err) => {
        this._logger.error('RabbitMQ closed', err)
        this.emit('close', err)
      })
      conn.on('blocked', (reason) => {
        this._logger.error('RabbitMQ blocked', reason)
        this.emit('blocked', reason)
      })
      conn.on('unblocked', (reason) => {
        this._logger.error('RabbitMQ unblocked', reason)
        this.emit('unblocked', reason)
      })

      this._connection = conn
      return conn
    }).catch((err) => {
      this._logger.error('RabbitMQ connection failed', err)

      throw err
    })

    return this._connectionPromise
  }

  async _connect (configUrl, options) {
    if (Array.isArray(configUrl)) {
      // handle multiple connection urls
      for (const url of configUrl) {
        try {
          const connection = await amqp.connect(url, options)
          this._activeConnectionUrl = url
          return connection
        } catch (err) {
          // let the next connection url in the list by tried
          const urlObject = new URL(url)
          this._logger.warn('RabbitMQ connection failed to host:', urlObject.host)
        }
      }

      throw new Error('RabbitMQ connection filed with multiple urls')
    } else {
      // assume simple url string
      const connection = await amqp.connect(configUrl, options)
      this._activeConnectionUrl = configUrl
      return connection
    }
  }

  /**
   * @return Promise
   * */
  async close () {
    if (this._connection) {
      try {
        await this._connection.close()
      } catch (err) {
        this._logger.error('RabbitMQ close connection failed', err)
        throw err
      }
    }

    this._connection = null
    this._connectionPromise = null
  }

  /**
   * @return Promise<amqplib.ConfirmChannel>
   * */
  getChannel () {
    if (this._channel) {
      return Promise.resolve(this._channel)
    } else if (this._channelPromise) {
      return this._channelPromise
    }

    this._channelPromise = this.connect().then((connection) => {
      return connection.createConfirmChannel()
    }).then((channel) => {
      this._channel = channel
      return channel
    }).catch((err) => {
      this._logger.error(err)
      throw err
    })

    return this._channelPromise
  }
}

module.exports = QueueConnection
