class QueueMessage {
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
      message.setError('ERR_MESSAGE_MALFORMED')
      return message
    }

    let {body, headers} = json
    this.setBody(body)
    this.setHeaders(headers)

    return message
  }

  constructor () {
    this.body = null
    this.headers = new Map()
    this.error = null
    this._sent = false
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
    if (!this._sent) {
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
   * @return {Buffer}
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
