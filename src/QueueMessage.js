class QueueMessage {
  constructor (status, data) {
    this.status = status
    this.data = data
  }

  static fromJSON (jsonString) {
    try {
      let param = JSON.parse(jsonString)
      if (!param || !param.status) {
        return new QueueMessage('error', 'cannot decode JSON string')
      }

      return new QueueMessage(param.status, param.data)
    } catch (err) {
      return new QueueMessage('error', err)
    }
  }
}

module.exports = QueueMessage
