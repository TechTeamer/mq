const QueueManager = require('./QueueManager')
const QueueConfig = require('./QueueConfig')

/**
 * @class ConnectionPool
 * */
class ConnectionPool {
  /**
   * @param {Object} poolConfig
   * @param {{}} [poolConfig]
   * @param {String} [poolConfig.defaultConnectionName]
   */
  constructor (poolConfig) {
    let { defaultConnectionName } = poolConfig || {}

    this._logger = null
    this.connections = new Map()
    this.defaultConnection = null
    this.defaultConnectionName = defaultConnectionName || 'default'
  }

  setupQueueManagers (connectionConfigs) {
    let defaultConnectionName = this.defaultConnectionName
    let defaultConnectionConfig = null
    let restConnections = null

    if (QueueConfig.isValidConfig(connectionConfigs)) {
      // single connection config (backwards compatible)
      defaultConnectionConfig = connectionConfigs
      restConnections = null
    } else {
      // multi connection config
      defaultConnectionConfig = connectionConfigs[defaultConnectionName]
      if (QueueConfig.isValidConfig(defaultConnectionConfig)) {
        // default connection
        delete connectionConfigs[defaultConnectionName]
        // the rest of the connection configs
        restConnections = connectionConfigs
      } else {
        this._logger.error('Invalid default connections config', defaultConnectionConfig)
        throw new Error('Invalid default connections config')
      }
    }

    if (defaultConnectionConfig) {
      let connection = this.createConnection(defaultConnectionConfig)
      this.registerConnection(defaultConnectionName, connection)
      this.setDefaultConnection(connection)
    }

    if (restConnections) {
      Object.keys(restConnections).forEach((connectionName) => {
        let connectionConfig = restConnections[connectionName]
        let connection = this.createConnection(connectionConfig)
        this.registerConnection(connectionName, connection)
      })
    }
  }

  hasConnection (name) {
    return this.connections.has(name)
  }

  getConnection (name) {
    return this.connections.get(name)
  }

  createConnection (connectionConfig) {
    let connection = new QueueManager(connectionConfig)

    if (this._logger) {
      connection.setLogger(this._logger)
    }

    return connection
  }

  registerConnection (name, connection) {
    this.connections.set(name, connection)
  }

  setDefaultConnection (connection) {
    this.defaultConnection = connection
  }

  getDefaultConnection () {
    return this.defaultConnection
  }

  setLogger (logger) {
    this._logger = logger
  }

  /**
   * @return {Promise}
   */
  connect () {
    let connections = [...this.connections.values()]

    return connections.reduce((promise, connection) => {
      return promise.then(() => connection.connect())
    }, Promise.resolve())
  }
}

module.exports = ConnectionPool
