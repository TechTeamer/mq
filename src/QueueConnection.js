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
    this._activeConnectionConfig = null
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
      this._logger.info(`RabbitMQ connection established on '${this._config.url.hostname}' host`)

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
          this._activeConnectionConfig = url
          return connection
        } catch (err) {
          // let the next connection url in the list by tried
          this._logger.warn('RabbitMQ connection failed to url:', url)
        }
      }

      throw new Error('RabbitMQ connection filed with multiple urls')
    } else if (Array.isArray(configUrl.hostname)) {
      // handle multiple connection hosts
      for (const host of configUrl.hostname) {
        const connectionUrl = {
          ...this._config.url, // copy given config
          hostname: host // use hostname from current iteration
        }

        try {
          const connection = await amqp.connect(connectionUrl, options)
          this._activeConnectionConfig = connectionUrl
          return connection
        } catch (err) {
          this._logger.warn('RabbitMQ connection failed to host:', { ...connectionUrl, password: connectionUrl.password ? '***' : connectionUrl.password })
        }
      }

      throw new Error('RabbitMQ connection filed with multiple hosts')
    } else {
      // assume simple url string or standard url object
      return amqp.connect(configUrl, options)
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
