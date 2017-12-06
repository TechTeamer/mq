
class RabbitMQOptions {
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
  constructor (config = {}) {
    let {
      url = 'amqps://localhost:5672',
      options = null,
      rpcTimeoutMs = 10000,
      rpcQueueMaxSize = 100,
      logger = console
    } = config

    let rabbitMqOptions = new RabbitMQOptions(options)
    this.url = url
    this.options = rabbitMqOptions
    this.rpcTimeoutMs = rpcTimeoutMs
    this.rpcQueueMaxSize = rpcQueueMaxSize
    this.logger = logger
  }
}

module.exports = QueueConfig
