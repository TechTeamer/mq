const ERROR_MESSAGE_MALFORMED = 'messag_malformed'

class QueueMessage {
  static get ERROR_MESSAGE_MALFORMED () {
    return ERROR_MESSAGE_MALFORMED
  }

  /**
   * @param {String} content
   * @return {QueueMessage}
   */
  static deserialize (content) {
    let message = new this()
    let json

    try {
      json = JSON.parse(content)
    } catch (e) {
      message.setError(ERROR_MESSAGE_MALFORMED)
      return message
    }

    let {body, headers, error} = json
    message.setBody(body)
    message.setError(error)
    message.setHeaders(headers)

    return message
  }

  constructor (body, headers) {
    this.body = null
    this.headers = new Map()
    this.error = null
    this._sent = false

    this.ERROR_MESSAGE_MALFORMED = ERROR_MESSAGE_MALFORMED

    this.setBody(body)
    this.setHeaders(headers)
  }

  setBody (body) {
    if (!this._sent) {
      this.body = body
    }
  }

  setHeader (name, value) {
    if (!this._sent) {
      this.headers.set(name, value)
    }
  }

  setHeaders (headers) {
    if (!this._sent && headers) {
      Object.keys(headers).forEach((name) => {
        this.setHeader(name, headers[name])
      })
    }
  }

  getHeader (name) {
    return this.headers.get(name)
  }

  setError (error) {
    this.error = error
  }

  /**
   * @return {String}
   */
  serialize () {
    let json = this.toJSON()

    return JSON.stringify(json, null, 0)
  }

  toJSON () {
    let body = this.body
    let error = this.error
    let headers = [...this.headers.keys()].reduce((headers, name) => {
      headers[name] = this.getHeader(name)
      return headers
    }, {})

    return {
      body,
      error,
      headers
    }
  }
}

module.exports = QueueMessage
