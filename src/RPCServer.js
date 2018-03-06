const QueueMessage = require('./QueueMessage')
const RPCError = require('./RPCError')

/**
 * @class RPCServer
 * */
class RPCServer {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} rpcName
   * @param {Object} options
   */
  constructor (queueConnection, logger, rpcName, options) {
    this._connection = queueConnection
    this._logger = logger
    this.name = rpcName
    this._replyQueue = ''

    let {prefetchCount, timeoutMs} = options
    this._prefetchCount = prefetchCount
    this._timeoutMs = timeoutMs

    this._callback = () => Promise.resolve()
    this._initializePromise = undefined
  }

  /**
   * @return {Promise}
   */
  initialize () {
    if (this._initializePromise) {
      return this._initializePromise
    }

    this._initializePromise = this._connection.getChannel().then((channel) => {
      return channel.assertQueue(this.name, {durable: true}).then(() => {
        channel.prefetch(this._prefetchCount)
      }).then(() => {
        channel.consume(this.name, (msg) => {
          this._processMessage(channel, msg)
        })
      })
    }).catch((err) => {
      this._logger.error('CANNOT CREATE RPC SERVER CHANNEL', err)
    })

    return this._initializePromise
  }

  /**
   * @param ch
   * @param msg
   * @private
   */
  _ack (ch, msg) {
    if (msg.acked) {
      this._logger.error('trying to double ack', msg)
      return
    }
    ch.ack(msg)
    msg.acked = true
  }

  /**
   * @param ch
   * @param msg
   * @return {Promise}
   * @private
   */
  _processMessage (ch, msg) {
    let request = QueueMessage.deserialize(msg.content)

    if (request.status !== 'ok') {
      this._logger.error('CANNOT GET RPC CALL PARAMS', this.name, request)

      ch.sendToQueue(msg.properties.replyTo, new QueueMessage('error', 'cannot decode parameters').serialize(), {correlationId: msg.properties.correlationId})
      this._ack(ch, msg)
      return
    }

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      this._logger.error('timeout in RPCServer', this.name, request.data)
      ch.sendToQueue(msg.properties.replyTo, new QueueMessage('error', 'timeout').serialize(), {correlationId: msg.properties.correlationId})
      this._ack(ch, msg)
    }, this._timeoutMs)

    return Promise.resolve().then(() => {
      return this._callback(request.data)
    }).then((answer) => {
      if (timedOut) {
        return
      }

      clearTimeout(timer)
      let reply
      try {
        reply = new QueueMessage('ok', answer).serialize()
      } catch (err) {
        this._logger.error('CANNOT SEND RPC REPLY', this.name, err)

        ch.sendToQueue(msg.properties.replyTo, new QueueMessage('error', 'cannot encode anwser').serialize(), {correlationId: msg.properties.correlationId})
        this._ack(ch, msg)

        return
      }

      ch.sendToQueue(msg.properties.replyTo, reply, {correlationId: msg.properties.correlationId})
      this._ack(ch, msg)
    }).catch((err) => {
      if (timedOut) {
        return
      }

      clearTimeout(timer)
      let message = 'cannot answer to rpc call'

      if (!(err instanceof RPCError)) {
        this._logger.error('RPC REPLY FAILED %s', this.name, err)
      } else {
        message = err.message
      }

      ch.sendToQueue(msg.properties.replyTo, new QueueMessage('error', message).serialize(), {correlationId: msg.properties.correlationId})
      this._ack(ch, msg)
    })
  }

  /**
   * @param {Function} cb
   */
  consume (cb) {
    this._callback = cb
  }
}

module.exports = RPCServer
