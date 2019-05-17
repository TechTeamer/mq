class QueueResponse {
  constructor () {
    this.attachments = new Map()
  }

  /**
   * @param {String} name
   * @param {Buffer} buffer
   */
  addAttachment (name, buffer) {
    this.attachments.set(name, buffer)
  }

  /**
   * @param {String} name
   * @returns {Buffer}
   */
  getAttachment (name) {
    return this.attachments.get(name)
  }

  /**
   * @param {String} name
   * @returns {boolean}
   */
  hasAttachment (name) {
    return this.attachments.has(name)
  }

  /**
   * @returns {boolean}
   */
  hasAnyAttachments () {
    return this.attachments.size > 0
  }

  /**
   * @returns {Map<String, Buffer>}
   */
  getAttachments () {
    return this.attachments
  }
}

module.exports = QueueResponse
