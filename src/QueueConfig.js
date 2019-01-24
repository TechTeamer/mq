
class RabbitMqOptions {
  constructor (options = {}) {
    let {
      rejectUnauthorized = false,
      cert = '',
      key = '',
      ca = []
    } = options

    this.rejectUnauthorized = rejectUnauthorized
    this.cert = cert
    this.key = key
    this.ca = ca
  }
}

class QueueConfig {
  static isValidConfig (obj) {
    if (!obj || !obj.url) {
      // throw new Error('Missing url ' + JSON.stringify(obj))
      return false
    }
    if (obj.options && (!obj.options.cert || !obj.options.key || !obj.options.ca)) {
      // throw new Error('Invalid options')
      return false
    }

    return true
  }

  constructor (config = {}) {
    let {
      url = 'amqps://localhost:5672',
      options = {},
      rpcTimeoutMs = 10000,
      rpcQueueMaxSize = 100,
      logger = console
    } = config

    let rabbitMqOptions = new RabbitMqOptions(options)
    this.url = url
    this.options = rabbitMqOptions
    this.rpcTimeoutMs = rpcTimeoutMs
    this.rpcQueueMaxSize = rpcQueueMaxSize
    this.logger = logger
  }
}

module.exports = QueueConfig
