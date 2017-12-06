const QueueConfig = require('./QueueConfig')
const QueueConnection = require('./QueueConnection')
const RPCClient = require('./RPCClient')
const RPCServer = require('./RPCServer')
const QueueClient = require('./QueueClient')
const QueueServer = require('./QueueServer')

/**
 * @class QueueService
 * @param {QueueConnection} connection
 * */
class QueueService {
  /**
   * @param {QueueConfig} config
   */
  constructor (config) {
    this.connection = new QueueConnection(config)
    this._config = new QueueConfig(config)
    this.rpcClients = new Map()
    this.rpcServers = new Map()
    this.queueClients = new Map()
    this.queueServers = new Map()
  }

  /**
   * @param {String} rpcName
   * @return RPCClient
   * */
  getRPCClient (rpcName) {
    if (this.rpcClients.has(rpcName)) {
      return this.rpcClients.get(rpcName)
    }

    const rpcClient = new RPCClient(this.connection, this._config.logger, rpcName, this._config.rpcQueueMaxSize, this._config.rpcTimeoutMs)

    this.rpcClients.set(rpcName, rpcClient)

    return rpcClient
  }

  /**
   * @param {String} rpcName
   * @param {Number} [prefetchCount]
   * @param {Number} [timeoutMs]
   * @return RPCServer
   */
  getRPCServer (rpcName, prefetchCount = 1, timeoutMs = this._config.rpcTimeoutMs) {
    if (this.rpcServers.has(rpcName)) {
      return this.rpcServers.get(rpcName)
    }

    const rpcServer = new RPCServer(this.connection, this._config.logger, rpcName, prefetchCount, timeoutMs)

    this.rpcServers.set(rpcName, rpcServer)

    return rpcServer
  }

  /**
   * @param {String} queueName
   * @return QueueClient
   */
  getQueueClient (queueName) {
    if (this.queueClients.has(queueName)) {
      return this.queueClients.get(queueName)
    }

    const queueClient = new QueueClient(this.connection, this._config.logger, queueName)

    this.queueClients.set(queueName, queueClient)

    return queueClient
  }

  /**
   * @param {String} queueName
   * @param {Number} [prefetchCount]
   * @param {Number} [maxRetry]
   * @param {Number} [timeoutMs]
   * @return QueueServer
   */
  getQueueServer (queueName, prefetchCount = 1, maxRetry = 5, timeoutMs = this._config.rpcTimeoutMs) {
    if (this.queueServers.has(queueName)) {
      return this.queueServers.get(queueName)
    }

    const queueServer = new QueueServer(this.connection, this._config.logger, queueName, prefetchCount, maxRetry, timeoutMs)

    this.queueServers.set(queueName, queueServer)

    return queueServer
  }
}

module.exports = QueueService
