const STATUS_SUCCESS = 'success'
const STATUS_ERROR = 'error'
const ERROR_INTERNAL = 'internal'
const ERROR_OPERATION_FAILED = 'operation_failed'
const ERROR_REPLY_FAILED = 'reply_failed'
const ERROR_MESSAGE_FAILED = 'message_failed'
const ERROR_UNAUTHORIZED = 'unauthorized'
const ERROR_BAD_MESSAGE = 'bad_message'
const ERROR_MALFORMED = 'malformed'
const ERROR_REPLY_MALFORMED = 'reply_malformed'
const ERROR_MESSAGE_MALFORMED = 'messag_malformed'
const ERROR_TIMED_OUT = 'timed_out'
const ERROR_MESSAGE_TIMED_OUT = 'message_timed_out'
const ERROR_REPLY_TIMED_OUT = 'reply_timed_out'

class QueueReply {
  static get STATUS_SUCCESS () {
    return STATUS_SUCCESS
  }

  static get STATUS_ERROR () {
    return STATUS_ERROR
  }

  static get ERROR_INTERNAL () {
    return ERROR_INTERNAL
  }

  static get ERROR_OPERATION_FAILED () {
    return ERROR_OPERATION_FAILED
  }

  static get ERROR_REPLY_FAILED () {
    return ERROR_REPLY_FAILED
  }

  static get ERROR_MESSAGE_FAILED () {
    return ERROR_MESSAGE_FAILED
  }

  static get ERROR_UNAUTHORIZED () {
    return ERROR_UNAUTHORIZED
  }

  static get ERROR_BAD_MESSAGE () {
    return ERROR_BAD_MESSAGE
  }

  static get ERROR_MALFORMED () {
    return ERROR_MALFORMED
  }

  static get ERROR_REPLY_MALFORMED () {
    return ERROR_REPLY_MALFORMED
  }

  static get ERROR_MESSAGE_MALFORMED () {
    return ERROR_MESSAGE_MALFORMED
  }

  static get ERROR_TIMED_OUT () {
    return ERROR_TIMED_OUT
  }

  static get ERROR_MESSAGE_TIMED_OUT () {
    return ERROR_MESSAGE_TIMED_OUT
  }

  static get ERROR_REPLY_TIMED_OUT () {
    return ERROR_REPLY_TIMED_OUT
  }

  /**
   * @param {String} content
   * @return {QueueReply}
   */
  static deserialize (content) {
    let message = new this()
    let json

    try {
      json = JSON.parse(content)
    } catch (e) {
      message.setStatus(STATUS_ERROR)
      message.setError(ERROR_REPLY_MALFORMED)

      return message
    }

    let {status, body, error, headers} = json

    message.setStatus(status)
    message.setBody(body)
    message.setError(error)
    message.setHeaders(headers)

    return message
  }

  constructor () {
    this.status = null
    this.body = null
    this.error = null
    this.headers = new Map()

    this.STATUS_SUCCESS = STATUS_SUCCESS
    this.STATUS_ERROR = STATUS_ERROR
    this.ERROR_INTERNAL = ERROR_INTERNAL
    this.ERROR_OPERATION_FAILED = ERROR_OPERATION_FAILED
    this.ERROR_REPLY_FAILED = ERROR_REPLY_FAILED
    this.ERROR_MESSAGE_FAILED = ERROR_MESSAGE_FAILED
    this.ERROR_UNAUTHORIZED = ERROR_UNAUTHORIZED
    this.ERROR_BAD_MESSAGE = ERROR_BAD_MESSAGE
    this.ERROR_MALFORMED = ERROR_MALFORMED
    this.ERROR_REPLY_MALFORMED = ERROR_REPLY_MALFORMED
    this.ERROR_MESSAGE_MALFORMED = ERROR_MESSAGE_MALFORMED
    this.ERROR_TIMED_OUT = ERROR_TIMED_OUT
    this.ERROR_MESSAGE_TIMED_OUT = ERROR_MESSAGE_TIMED_OUT
    this.ERROR_REPLY_TIMED_OUT = ERROR_REPLY_TIMED_OUT
  }

  setStatus (status) {
    this.status = status
  }

  setError (error) {
    this.error = error
  }

  setBody (body) {
    this.body = body
  }

  setHeader (name, value) {
    this.headers.set(name, value)
  }

  setHeaders (headers) {
    Object.keys(headers).forEach((name) => {
      this.setHeader(name, headers[name])
    })
  }

  getHeader (name) {
    return this.headers.get(name)
  }

  /**
   * @return {Buffer}
   * */
  serialize () {
    let json = this.toJSON()
    return JSON.stringify(json)
  }

  toJSON () {
    let status = this.status
    let body = this.body
    let error = this.error
    let headers = [...this.headers.keys()].reduce((headers, name) => {
      headers[name] = this.getHeader(name)
      return headers
    }, {})

    return {
      status,
      body,
      error,
      headers
    }
  }
}

module.exports = QueueReply
