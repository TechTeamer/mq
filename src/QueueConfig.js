
class RabbitMqOptions {
  constructor (options = {}) {
    const {
      rejectUnauthorized = false,
      cert = '',
      key = '',
      ca = []
    } = options

    this.rejectUnauthorized = rejectUnauthorized
    this.cert = cert
    this.key = key
    this.ca = ca
    if (options.timeout) {
      this.timeout = options.timeout
    }
  }
}

class QueueConfig {
  static isValidConfig (obj) {
    return !!(obj && obj.url)
  }

  constructor (config = {}) {
    const {
      url = 'amqps://localhost:5672',
      options = {},
      rpcTimeoutMs = 10000,
      rpcQueueMaxSize = 100,
      logger = console
    } = config

    const rabbitMqOptions = new RabbitMqOptions(options)
    this.url = url
    this.options = rabbitMqOptions
    this.rpcTimeoutMs = rpcTimeoutMs
    this.rpcQueueMaxSize = rpcQueueMaxSize
    this.logger = logger
  }
}

module.exports = QueueConfig
