class QueueResponse {
  constructor () {
    this.attachments = new Map()
  }

  addAttachment (name, buffer) {
    this.attachments.set(name, buffer)
  }

  getAttachments () {
    return this.attachments
  }
}

module.exports = QueueResponse
