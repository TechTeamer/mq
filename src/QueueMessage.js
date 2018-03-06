const BSON = require('bson')

class QueueMessage {
  constructor (status, data) {
    this.status = status
    this.data = data
  }

  serialize () {
    let bson = new BSON()

    return bson.serialize(this.toJSON())
  }

  static deserialize (content) {
    let bson = new BSON()
    try {
      let param = bson.deserialize(content, {
        promoteBuffers: true,
        promoteValues: true
      })
      return new QueueMessage(param.status, param.data)
    } catch (err) {
      return new QueueMessage('error', err)
    }
  }

  toJSON () {
    return {
      status: this.status,
      data: this.data
    }
  }
}

module.exports = QueueMessage
