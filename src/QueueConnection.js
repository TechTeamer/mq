import fs from 'fs'
import * as amqp from 'amqplib/channel_api.js'
import QueueConfig from './QueueConfig.js'
import EventEmitter from 'events'
/**
 * @class QueueConnection
 * */
class QueueConnection extends EventEmitter {
  /**
     * @param {Object|QueueConfig} config
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
  async connect () {
    if (this._connection) {
      return this._connection
    }
    if (this._connectionPromise) {
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
    this._connectionPromise = this._connect(this._config.url, options).then((connection) => {
      this._logger.info(`RabbitMQ connection established: '${QueueConfig.urlObjectToLogString(this._activeConnectionConfig)}'`)
      this.emitConnectionEvents(connection)
      this._connection = connection
      return connection
    }).catch((err) => {
      this._logger.error('RabbitMQ connection failed', err)
      this._connectionPromise = null
      throw err
    })
    return this._connectionPromise
  }

  emitConnectionEvents (connection) {
    connection.on('error', (err) => {
      if (err.message !== 'Connection closing') {
        this._logger.error('RabbitMQ error', err)
        if (this.listenerCount('error') > 0) {
          // NOTE: https://nodejs.org/docs/latest-v18.x/api/errors.html#error-propagation-and-interception
          // 'error' named events must have a subscriber in order to avoid uncaughtException errors.
          // We use this listenerCount condition to avoid emitting errors if there are no listeners.
          this.emit('error', err)
        }
      }
    })
    connection.on('close', (err) => {
      this._logger.error('RabbitMQ closed', err)
      this.emit('close', err)
    })
    connection.on('blocked', (reason) => {
      this._logger.error('RabbitMQ blocked', reason)
      this.emit('blocked', reason)
    })
    connection.on('unblocked', (reason) => {
      this._logger.error('RabbitMQ unblocked', reason)
      this.emit('unblocked', reason)
    })
  }

  async _connect (configUrl, options) {
    // handle multiple connection hosts
    if (Array.isArray(configUrl.hostname)) {
      const urls = []
      for (const host of configUrl.hostname) {
        urls.push({
          ...configUrl,
          hostname: host // use hostname from current iteration
        })
      }
      configUrl = urls
    }
    // handle multiple connection urls
    if (Array.isArray(configUrl)) {
      return this._connectWithMultipleUrls(configUrl, options)
    }
    // assume simple url string or standard url object
    const connectionUrl = QueueConfig.urlStringToObject(configUrl)
    const connection = await amqp.connect(configUrl, options)
    this._activeConnectionConfig = connectionUrl
    return connection
  }

  async _connectWithMultipleUrls (urls, options) {
    if (this._config.shuffleUrls) {
      urls = this.shuffleUrls(urls)
    }
    for (const url of urls) {
      const connectionUrl = QueueConfig.urlStringToObject(url)
      try {
        const connection = await amqp.connect(connectionUrl, options)
        this._activeConnectionConfig = connectionUrl
        return connection
      } catch (err) {
        this._logger.warn('RabbitMQ connection failed to host:', { ...connectionUrl, password: connectionUrl.password ? '***' : connectionUrl.password })
      }
    }
    throw new Error('RabbitMQ connection failed with multiple urls')
  }

  shuffleUrls (urls) {
    // shuffle urls - try to connect to nodes in a random order
    return [...urls].sort((a, b) => 0.5 - Math.random())
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
        if (!err.message.startsWith('Connection closed')) {
          throw err
        }
      }
    }
    this._connection = null
    this._connectionPromise = null
  }

  /**
     * @return Promise<amqplib.ConfirmChannel>
     * */
  async getChannel () {
    if (this._channel) {
      return this._channel
    }
    if (this._channelPromise) {
      return this._channelPromise
    }
    this._channelPromise = this.connect().then((connection) => {
      return connection.createConfirmChannel()
    }).then((channel) => {
      this.emitChannelEvents(channel)
      this._channel = channel
      return channel
    }).catch((err) => {
      this._logger.error(err)
      throw err
    })
    return this._channelPromise
  }

  emitChannelEvents (channel) {
    channel.on('error', (err) => {
      this._logger.error('RabbitMQ channel error', err)
      if (this.listenerCount('error') > 0) {
        // NOTE: https://nodejs.org/docs/latest-v18.x/api/errors.html#error-propagation-and-interception
        // 'error' named events must have a subscriber in order to avoid uncaughtException errors.
        // We use this listenerCount condition to avoid emitting errors if there are no listeners.
        this.emit('error', err)
      }
    })
    channel.on('close', (err) => {
      this._logger.error('RabbitMQ channel closed', err)
      this.emit('close', err)
    })
    channel.on('return', (reason) => {
      this.emit('return', reason)
    })
    channel.on('drain', (reason) => {
      this.emit('drain', reason)
    })
  }
}
export default QueueConnection
