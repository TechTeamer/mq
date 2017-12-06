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
    this._rpcClients = new Map()
    this._rpcServers = new Map()
    this._queueClients = new Map()
    this._queueServers = new Map()
  }

  /**
   * @param {String} rpcName
   * @return RPCClient
   * */
  getRPCClient (rpcName) {
    if (this._rpcClients.has(rpcName)) {
      return this._rpcClients.get(rpcName)
    }

    const rpcClient = new RPCClient(this.connection, this._config.logger, rpcName)

    this._rpcClients.set(rpcName, rpcClient)

    return rpcClient
  }

  /**
   * @param {String} rpcName
   * @param {Number} [prefetchCount]
   * @param {Number} [timeoutMs]
   * @return RPCServer
   */
  getRPCServer (rpcName, prefetchCount = 1, timeoutMs = this._config.rpcTimeoutMs) {
    if (this._rpcServers.has(rpcName)) {
      return this._rpcServers.get(rpcName)
    }

    const rpcServer = new RPCServer(this.connection, this._config.logger, rpcName, prefetchCount, timeoutMs)

    this._rpcServers.set(rpcName, rpcServer)

    return rpcServer
  }

  /**
   * @param {String} queueName
   * @return QueueClient
   */
  getQueueClient (queueName) {
    if (this._queueClients.has(queueName)) {
      return this._queueClients.get(queueName)
    }

    const queueClient = new QueueClient(this.connection, this._config.logger, queueName, this._config.rpcQueueMaxSize, this._config.rpcTimeoutMs)

    this._queueClients.set(queueName, queueClient)

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
    if (this._queueServers.has(queueName)) {
      return this._queueServers.get(queueName)
    }

    const queueServer = new QueueServer(this.connection, this._config.logger, queueName, prefetchCount, maxRetry, timeoutMs)

    this._queueServers.set(queueName, queueServer)

    return queueServer
  }
}

module.exports = QueueService
