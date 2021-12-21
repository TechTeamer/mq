const QueueMessage = require('./QueueMessage')
const QueueResponse = require('./QueueResponse')

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
    const {
      prefetchCount,
      timeoutMs,
      RequestMessageModel,
      ResponseMessageModel,
      RequestContentSchema,
      ResponseContentSchema,
      queueOptions
    } = options || {}

    this._connection = queueConnection
    this._logger = logger
    this.name = rpcName
    this._queueOptions = Object.assign({ durable: true }, queueOptions || {})

    this._prefetchCount = prefetchCount
    this._timeoutMs = timeoutMs
    this.RequestModel = RequestMessageModel || QueueMessage
    this.ResponseModel = ResponseMessageModel || QueueMessage
    this.RequestContentSchema = RequestContentSchema || JSON
    this.ResponseContentSchema = ResponseContentSchema || JSON

    this.actions = new Map()
  }

  /**
   * @param {*} body
   * @param {QueueMessage} request
   * @param {QueueResponse} response
   * @param {Object} msg
   * @protected
   * @returns {Promise}
   */
  _callback (body, request, response, msg) {
    const { action, data } = body || {}
    if (!this.actions.has(action)) {
      return Promise.resolve()
    }

    const handler = this.actions.get(action)
    return Promise.resolve().then(() => handler.call(this, data, request, response, msg))
  }

  /**
   * @param {string} action
   * @param {Function} handler
   */
  registerAction (action, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(`${typeof handler} is not a Function`)
    } else if (this.actions.has(action)) {
      this._logger.warn(`Actions-handlers map already contains an action named ${action}`)
    } else {
      this.actions.set(action, handler)
    }
  }

  /**
   * @return {Promise}
   */
  async initialize () {
    try {
      const channel = await this._connection.getChannel()
      await channel.assertQueue(this.name, this._queueOptions)
      await channel.prefetch(this._prefetchCount)
      await channel.consume(this.name, (msg) => {
        this._processMessage(channel, msg)
      })
    } catch (err) {
      this._logger.error('CANNOT CREATE RPC SERVER CHANNEL', err)
      throw err
    }
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

  onResponseTimeout (ch, msg) {
    ch.sendToQueue(msg.properties.replyTo, new this.ResponseModel('error', 'timeout', null, this.ResponseContentSchema).serialize(), { correlationId: msg.properties.correlationId })
    this._ack(ch, msg)
  }

  onRequestError (ch, msg) {
    ch.sendToQueue(msg.properties.replyTo, new this.ResponseModel('error', 'cannot decode parameters', null, this.ResponseContentSchema).serialize(), { correlationId: msg.properties.correlationId })
    this._ack(ch, msg)
  }

  onResponseError (ch, msg) {
    ch.sendToQueue(msg.properties.replyTo, new this.ResponseModel('error', 'cannot anwser', null, this.ResponseContentSchema).serialize(), { correlationId: msg.properties.correlationId })
    this._ack(ch, msg)
  }

  /**
   * @param ch
   * @param msg
   * @return {Promise}
   * @private
   */
  async _processMessage (ch, msg) {
    const request = this.RequestModel.unserialize(msg.content, this.RequestContentSchema)

    const response = new QueueResponse()

    if (request.status !== 'ok') {
      this._logger.error('CANNOT GET RPC CALL PARAMS', this.name, request)

      this.onRequestError(ch, msg)
      return
    }

    let timedOut = false
    const timeoutMs = typeof request.timeOut === 'number' ? request.timeOut : this._timeoutMs
    const timer = setTimeout(() => {
      timedOut = true
      this._logger.error('RPCServer response timeout', this.name, request.data)
      this.onResponseTimeout(ch, msg, request)
    }, timeoutMs)

    try {
      const answer = await this._callback(request.data, request, response, msg)
      if (timedOut) {
        return
      }

      clearTimeout(timer)
      let replyData
      const replyAttachments = response.getAttachments()
      try {
        const reply = new this.ResponseModel('ok', answer, null, this.ResponseContentSchema)
        if (replyAttachments instanceof Map) {
          for (const [key, value] of replyAttachments) {
            reply.addAttachment(key, value)
          }
        }
        replyData = reply.serialize()
      } catch (err) {
        this._logger.error('CANNOT CREATE RPC REPLY', this.name, err)
        this.onResponseError(ch, msg, 'err')
        return
      }

      ch.sendToQueue(msg.properties.replyTo, replyData, { correlationId: msg.properties.correlationId })
      this._ack(ch, msg)
    } catch (err) {
      if (timedOut) {
        return
      }

      clearTimeout(timer)

      this._logger.error('CANNOT SEND RPC REPLY', this.name, err)
      this.onResponseError(ch, msg, err)
    }
  }

  /**
   * @param {Function} cb
   */
  consume (cb) {
    this._callback = cb
  }
}

module.exports = RPCServer
