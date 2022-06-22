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
      assertQueue = true
    } = options || {}

    this._connection = queueConnection
    this._logger = logger
    this.name = rpcName
    this._assertQueue = null

    if (assertQueue) {
      this._assertQueue = assertQueue === true
        ? { durable: true } // defaults
        : assertQueue
    }

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
      if (this._assertQueue) {
        await channel.assertQueue(this.name, this._assertQueue)
      }
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

  _createResponseTimeoutReply (_msg, _request) {
    return new this.ResponseModel('error', 'timeout', null, this.ResponseContentSchema)
  }

  onResponseTimeout (ch, msg, request) {
    ch.sendToQueue(msg.properties.replyTo, this._createResponseTimeoutReply(msg, request).serialize(), { correlationId: msg.properties.correlationId })
    this._ack(ch, msg)
  }

  handleResponseTimeout (ch, msg, request) {
    try {
      this.onResponseTimeout(ch, msg, request)
    } catch (err) {
      this._logger.error('Error handling RPC response timeout', err)
      this._ack(ch, msg)
    }
  }

  _createRequestErrorReply (_msg, _request) {
    return new this.ResponseModel('error', 'cannot decode parameters', null, this.ResponseContentSchema)
  }

  onRequestError (ch, msg, request) {
    ch.sendToQueue(msg.properties.replyTo, this._createRequestErrorReply(msg, request).serialize(), { correlationId: msg.properties.correlationId })
    this._ack(ch, msg)
  }

  handleRequestError (ch, msg, request) {
    try {
      this.onRequestError(ch, msg, request)
    } catch (err) {
      this._logger.error('Error handling RPC request error', err)
      this._ack(ch, msg)
    }
  }

  _createResponseErrorReply (_msg, _error, _request) {
    return new this.ResponseModel('error', 'cannot answer', null, this.ResponseContentSchema)
  }

  onResponseError (ch, msg, error, request) {
    ch.sendToQueue(msg.properties.replyTo, this._createResponseErrorReply(msg, error, request).serialize(), { correlationId: msg.properties.correlationId })
    this._ack(ch, msg)
  }

  handleResponseError (ch, msg, error, request) {
    try {
      this.onResponseError(ch, msg, error, request)
    } catch (err) {
      this._logger.error('Error handling RPC response error', err)
      this._ack(ch, msg)
    }
  }

  _createReply (_msg, answer) {
    return new this.ResponseModel('ok', answer, null, this.ResponseContentSchema)
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

      this.handleRequestError(ch, msg, request)
      return
    }

    let timedOut = false
    const timeoutMs = typeof request.timeOut === 'number' ? request.timeOut : this._timeoutMs
    const timer = setTimeout(() => {
      timedOut = true
      this._logger.error('RPCServer response timeout', this.name, request.data)
      this.handleResponseTimeout(ch, msg, request)
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
        const reply = this._createReply(msg, answer)
        if (replyAttachments instanceof Map) {
          for (const [key, value] of replyAttachments) {
            reply.addAttachment(key, value)
          }
        }
        replyData = reply.serialize()
      } catch (err) {
        this._logger.error('CANNOT CREATE RPC REPLY', this.name, err)
        this.handleResponseError(ch, msg, err, request)
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
      this.handleResponseError(ch, msg, err, request)
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
