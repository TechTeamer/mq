const QueueMessage = require('./QueueMessage')
const QueueReply = require('./QueueReply')
// const RPCError = require('./RPCError')

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
    let reply = new QueueReply()
    let message

    try {
      message = QueueMessage.deserialize(msg.content)
    } catch (ex) {
      let errorReply = new QueueReply()
      errorReply.setStatus(QueueReply.STATUS_ERROR)
      errorReply.setError(QueueReply.ERROR_MESSAGE_MALFORMED)
      let payload = errorReply.serialize()

      ch.sendToQueue(msg.properties.replyTo, payload, {
        correlationId: msg.properties.correlationId
      })
      this._ack(ch, msg)

      return
    }

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      this._logger.error('timeout in RPCServer', this.name, message)
      let errorReply = new QueueReply()
      errorReply.setStatus(errorReply.STATUS_ERROR)
      errorReply.setError(errorReply.ERROR_REPLY_TIMED_OUT)
      let payload = errorReply.serialize()

      ch.sendToQueue(msg.properties.replyTo, payload, {
        correlationId: msg.properties.correlationId
      })
      this._ack(ch, msg)
    }, this._timeoutMs)

    return Promise.resolve().then(() => {
      return this.consume(message, reply)
    }).then(() => {
      if (timedOut) {
        return
      }

      clearTimeout(timer)

      let payload

      try {
        payload = reply.serialize()
      } catch (e) {
        this._logger.error('RPC REPLY FAILED: MALFORMED_CONTENT', this.name, e)

        let errorReply = new QueueReply()
        errorReply.setStatus(QueueReply.STATUS_ERROR)
        errorReply.setError(QueueReply.ERROR_REPLY_MALFORMED)
        payload = errorReply.serialize()
        // or throw new error
      }

      ch.sendToQueue(msg.properties.replyTo, payload, {
        correlationId: msg.properties.correlationId
      })
      this._ack(ch, msg)
    }).catch((err) => {
      if (timedOut) {
        return
      }

      clearTimeout(timer)

      let errorReply = new QueueReply()
      errorReply.setStatus(QueueReply.STATUS_ERROR)
      errorReply.setError(QueueReply.ERROR_INTERNAL)
      let payload = errorReply.serialize()

      this._logger.error('RPC REPLY FAILED %s', this.name, err)

      ch.sendToQueue(msg.properties.replyTo, payload, {
        correlationId: msg.properties.correlationId
      })
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
