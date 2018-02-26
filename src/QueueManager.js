const QueueConfig = require('./QueueConfig')
const QueueConnection = require('./QueueConnection')
const RPCClient = require('./RPCClient')
const RPCServer = require('./RPCServer')
const Publisher = require('./Publisher')
const Subscriber = require('./Subscriber')
const QueueClient = require('./QueueClient')
const QueueServer = require('./QueueServer')
/**
 * @class QueueManager
 * @param {QueueConnection} connection
 * */
class QueueManager {
  /**
   * @param {QueueConfig} config
   */
  constructor (config) {
    this.connection = new QueueConnection(config)
    this._config = new QueueConfig(config)
    this._logger = this._config.logger

    this.rpcClients = new Map()
    this.rpcServers = new Map()
    this.publishers = new Map()
    this.subscribers = new Map()
    this.queueClients = new Map()
    this.queueServers = new Map()
  }

  connect () {
    return this.connection.connect()
  }

  getChannel () {
    return this.connection.getChannel()
  }

  setLogger (logger) {
    this._logger = logger
    this.connection.setLogger(logger)
  }

  /**
   * @param {String} rpcName
   * @param {Object} [options]
   * @return RPCClient
   * */
  getRPCClient (rpcName, options) {
    if (this.rpcClients.has(rpcName)) {
      return this.rpcClients.get(rpcName)
    }

    let settings = Object.assign({
      queueMaxSize: this._config.rpcQueueMaxSize,
      timeoutMs: this._config.rpcTimeoutMs
    }, options)

    const rpcClient = new RPCClient(this.connection, this._logger, rpcName, settings)

    this.rpcClients.set(rpcName, rpcClient)

    return rpcClient
  }

  /**
   * @param {String} rpcName
   * @param {Object} [options]
   * @return RPCServer
   */
  getRPCServer (rpcName, options) {
    if (this.rpcServers.has(rpcName)) {
      return this.rpcServers.get(rpcName)
    }

    let settings = Object.assign({
      prefetchCount: 1,
      timeoutMs: this._config.rpcTimeoutMs
    }, options)

    const rpcServer = new RPCServer(this.connection, this._logger, rpcName, settings)

    this.rpcServers.set(rpcName, rpcServer)

    return rpcServer
  }

  /**
   * @param {String} exchangeName
   * @return Publisher
   */
  getPublisher (exchangeName) {
    if (this.publishers.has(exchangeName)) {
      return this.publishers.get(exchangeName)
    }

    const publisher = new Publisher(this.connection, this._logger, exchangeName)

    this.publishers.set(exchangeName, publisher)

    return publisher
  }

  /**
   * @param {String} exchangeName
   * @param {Object} [options]
   * @return Subscriber
   */
  getSubscriber (exchangeName, options) {
    if (this.subscribers.has(exchangeName)) {
      return this.subscribers.get(exchangeName)
    }

    let settings = Object.assign({
      prefetchCount: 1,
      maxRetry: 5,
      timeoutMs: this._config.rpcTimeoutMs
    }, options)

    const subscriber = new Subscriber(this.connection, this._logger, exchangeName, settings)

    this.subscribers.set(exchangeName, subscriber)

    return subscriber
  }

  /**
   * @param {String} queueName
   * @return QueueClient
   */
  getQueueClient (queueName) {
    if (this.queueClients.has(queueName)) {
      return this.queueClients.get(queueName)
    }

    const queueClient = new QueueClient(this.connection, this._logger, queueName)

    this.queueClients.set(queueName, queueClient)

    return queueClient
  }

  /**
   * @param {String} queueName
   * @param {Object} [options]
   * @return QueueServer
   */
  getQueueServer (queueName, options) {
    if (this.queueServers.has(queueName)) {
      return this.queueServers.get(queueName)
    }

    let settings = Object.assign({
      prefetchCount: 1,
      maxRetry: 5,
      timeoutMs: this._config.rpcTimeoutMs
    }, options)

    const queueServer = new QueueServer(this.connection, this._logger, queueName, settings)

    this.queueServers.set(queueName, queueServer)

    return queueServer
  }
}

module.exports = QueueManager
