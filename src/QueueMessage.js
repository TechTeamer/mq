class QueueMessage {
  constructor (status, data, timeOut) {
    this.status = status
    this.data = data
    this.timeOut = timeOut
    this.attachments = new Map()
  }

  static fromJSON (jsonString) {
    try {
      let param = JSON.parse(jsonString)
      if (!param || !param.status) {
        return new QueueMessage('error', 'cannot decode JSON string')
      }

      return new QueueMessage(param.status, param.data, param.timeOut)
    } catch (err) {
      return new QueueMessage('error', err)
    }
  }

  serialize () {
    let obj = {
      'status': this.status,
      'data': this.data,
      'timeOut': this.timeOut
    }

    let attachmentBuffers = []
    let attachMap = new Map()
    this.attachments.forEach((value, key) => {
      attachmentBuffers.push(value)
      attachMap.set(key, value.length)
    })
    obj.attachArray = [...attachMap]

    let stringJson = JSON.stringify(obj)
    let formatBuf = Buffer.alloc(1, '+')
    let lengthBuf = Buffer.alloc(4)
    lengthBuf.writeUInt32BE(stringJson.length)
    let jsonBuf = Buffer.from(stringJson)
    return Buffer.concat([formatBuf, lengthBuf, jsonBuf, ...attachmentBuffers])
  }

  static unserialize (buffer) {
    if (buffer.slice(0, 1).toString('utf8') === '+') {
      let jsonLength = buffer.slice(1, 5).readUInt32BE()
      let { status, data, timeOut, attachArray } = JSON.parse(buffer.slice(5, 5 + jsonLength).toString('utf8'))
      let prevAttachmentLength = 5 + jsonLength
      let queueMessage = new QueueMessage(status, data, timeOut)
      for (const [key, length] of attachArray) {
        queueMessage.addAttachment(key, buffer.slice(prevAttachmentLength, prevAttachmentLength + length))
        prevAttachmentLength = prevAttachmentLength + length
      }
      Object.keys(attachArray).forEach((key) => {

      })
      return queueMessage
    } else if (buffer.slice(0, 1).toString('utf8') === '{') {
      return this.fromJSON(buffer.toString('utf8'))
    } else {
      throw new Error('Impossible to deserialize the message')
    }
  }

  addAttachment (name, buffer) {
    this.attachments.set(name, buffer)
  }

  getAttachments () {
    return this.attachments
  }
}

module.exports = QueueMessage
