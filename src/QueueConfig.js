const { URL } = require('node:url')

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

  static isValidConfig (obj) {
    return !!(obj && obj.url)
  }

  static urlStringToObject (url) {
    if (typeof url !== 'string') {
      return url
    }

    const parsedUrl = new URL(url)
    return {
      protocol: parsedUrl.protocol ? parsedUrl.protocol.slice(0, -1) : undefined,
      hostname: parsedUrl.hostname ? parsedUrl.hostname : undefined,
      port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : undefined,
      username: parsedUrl.username ? parsedUrl.username : undefined,
      password: parsedUrl.password ? parsedUrl.password : undefined,
      vhost: parsedUrl.pathname ? parsedUrl.pathname.slice(1) : undefined
    }
  }

  static urlObjectToLogString (urlObject) {
    return [
      urlObject.protocol || 'amqps',
      '://',
      urlObject.hostname,
      urlObject.port ? `:${urlObject.port}` : '',
      urlObject.vhost ? `/${urlObject.vhost}` : ''
    ].join('')
  }
}

module.exports = QueueConfig
