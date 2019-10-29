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
    return Promise.resolve().then(() => {
      return this.connection.connect()
    }).catch((err) => {
      this._logger.error('Filed to connect to queue server', err)
      throw err
    }).then(() => {
      return Promise.all([...this.rpcServers.values()].map((rpcServer) => {
        return rpcServer.initialize()
      }))
    }).then(() => {
      return Promise.all([...this.subscribers.values()].map((subscriber) => {
        return subscriber.initialize()
      }))
    }).then(() => {
      return Promise.all([...this.queueServers.values()].map((queueServer) => {
        return queueServer.initialize()
      }))
    }).catch((err) => {
      this._logger.error('Failed to initialize servers', err)
      throw err
    })
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
   * @param {RPCClient|function() : RPCClient} OverrideClass
   * @param {Object} [options]
   * @return RPCClient
   * */
  getRPCClient (rpcName, OverrideClass = RPCClient, options = {}) {
    if (this.rpcClients.has(rpcName)) {
      return this.rpcClients.get(rpcName)
    }

    if (arguments.length === 2 && typeof OverrideClass !== 'function') {
      options = OverrideClass
      OverrideClass = RPCClient
    }

    if (OverrideClass !== RPCClient && !(OverrideClass.prototype instanceof RPCClient)) {
      throw new Error('Override must be a subclass of RPCClient')
    }

    const settings = Object.assign({
      queueMaxSize: this._config.rpcQueueMaxSize,
      timeoutMs: this._config.rpcTimeoutMs
    }, options)

    const rpcClient = new OverrideClass(this.connection, this._logger, rpcName, settings)

    this.rpcClients.set(rpcName, rpcClient)

    return rpcClient
  }

  /**
   * @param {String} rpcName
   * @param {RPCServer|function() : RPCServer} OverrideClass
   * @param {Object} [options]
   * @return RPCServer
   */
  getRPCServer (rpcName, OverrideClass = RPCServer, options = {}) {
    if (this.rpcServers.has(rpcName)) {
      return this.rpcServers.get(rpcName)
    }

    if (arguments.length === 2 && typeof OverrideClass !== 'function') {
      options = OverrideClass
      OverrideClass = RPCServer
    }

    if (OverrideClass !== RPCServer && !(OverrideClass.prototype instanceof RPCServer)) {
      throw new Error('Override must be a subclass of RPCServer')
    }

    const settings = Object.assign({
      prefetchCount: 1,
      timeoutMs: this._config.rpcTimeoutMs
    }, options)

    const rpcServer = new OverrideClass(this.connection, this._logger, rpcName, settings)

    this.rpcServers.set(rpcName, rpcServer)

    return rpcServer
  }

  /**
   * @param {String} exchangeName
   * @param {Publisher|function() : Publisher} OverrideClass
   * @return Publisher
   */
  getPublisher (exchangeName, OverrideClass = Publisher) {
    if (this.publishers.has(exchangeName)) {
      return this.publishers.get(exchangeName)
    }

    if (OverrideClass !== Publisher && !(OverrideClass.prototype instanceof Publisher)) {
      throw new Error('Override must be a subclass of Publisher')
    }

    const publisher = new OverrideClass(this.connection, this._logger, exchangeName)

    this.publishers.set(exchangeName, publisher)

    return publisher
  }

  /**
   * @param {String} exchangeName
   * @param {Subscriber|function() : Subscriber} OverrideClass
   * @param {Object} [options]
   * @return Subscriber
   */
  getSubscriber (exchangeName, OverrideClass = Subscriber, options = {}) {
    if (this.subscribers.has(exchangeName)) {
      return this.subscribers.get(exchangeName)
    }

    if (arguments.length === 2 && typeof OverrideClass !== 'function') {
      options = OverrideClass
      OverrideClass = Subscriber
    }

    if (OverrideClass !== Subscriber && !(OverrideClass.prototype instanceof Subscriber)) {
      throw new Error('Override must be a subclass of Subscriber')
    }

    const settings = Object.assign({
      prefetchCount: 1,
      maxRetry: 5,
      timeoutMs: this._config.rpcTimeoutMs
    }, options)

    const subscriber = new OverrideClass(this.connection, this._logger, exchangeName, settings)

    this.subscribers.set(exchangeName, subscriber)

    return subscriber
  }

  /**
   * @param {String} queueName
   * @param {QueueClient|function() : QueueClient} OverrideClass
   * @return QueueClient
   */
  getQueueClient (queueName, OverrideClass = QueueClient) {
    if (this.queueClients.has(queueName)) {
      return this.queueClients.get(queueName)
    }

    if (OverrideClass !== QueueClient && !(OverrideClass.prototype instanceof QueueClient)) {
      throw new Error('Override must be a subclass of QueueClient')
    }

    const queueClient = new OverrideClass(this.connection, this._logger, queueName)

    this.queueClients.set(queueName, queueClient)

    return queueClient
  }

  /**
   * @param {String} queueName
   * @param {QueueServer|function() : QueueServer} OverrideClass
   * @param {Object} [options]
   * @return QueueServer
   */
  getQueueServer (queueName, OverrideClass = QueueServer, options = {}) {
    if (this.queueServers.has(queueName)) {
      return this.queueServers.get(queueName)
    }

    if (arguments.length === 2 && typeof OverrideClass !== 'function') {
      options = OverrideClass
      OverrideClass = QueueServer
    }

    if (OverrideClass !== QueueServer && !(OverrideClass.prototype instanceof QueueServer)) {
      throw new Error('Override must be a subclass of QueueServer')
    }

    const settings = Object.assign({
      prefetchCount: 1,
      maxRetry: 5,
      timeoutMs: this._config.rpcTimeoutMs
    }, options)

    const queueServer = new OverrideClass(this.connection, this._logger, queueName, settings)

    this.queueServers.set(queueName, queueServer)

    return queueServer
  }
}

module.exports = QueueManager
