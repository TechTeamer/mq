class QueueMessage {
  constructor (status, data, timeOut, ContentSchema = JSON) {
    this.status = status
    this.data = data
    this.timeOut = timeOut
    this.attachments = new Map()
    this.ContentSchema = ContentSchema
  }

  static fromJSON (jsonString) {
    try {
      const param = JSON.parse(jsonString)
      if (!param || !param.status) {
        return new QueueMessage('error', 'cannot decode JSON string')
      }

      return new QueueMessage(param.status, param.data, param.timeOut)
    } catch (err) {
      return new QueueMessage('error', err)
    }
  }

  serialize () {
    const obj = {
      status: this.status,
      data: this.data,
      timeOut: this.timeOut
    }

    const attachmentBuffers = []
    const attachMap = new Map()
    this.attachments.forEach((value, key) => {
      attachmentBuffers.push(value)
      attachMap.set(key, value.length)
    })
    obj.attachArray = [...attachMap]

    const stringJson = JSON.stringify(obj)
    const formatBuf = Buffer.alloc(1, '+')
    const lengthBuf = Buffer.alloc(4)
    const jsonBuf = Buffer.from(stringJson)
    lengthBuf.writeUInt32BE(jsonBuf.length)
    return Buffer.concat([formatBuf, lengthBuf, jsonBuf, ...attachmentBuffers])
  }

  /**
   * @param {Buffer} buffer
   * @param ContentSchema
   * @returns {QueueMessage}
   */
  static unserialize (buffer, ContentSchema = JSON) {
    if (!ContentSchema || ContentSchema === JSON) {
      if (buffer.toString('utf8', 0, 1) === '+') {
        const jsonLength = buffer.subarray(1, 5).readUInt32BE()
        const { status, data, timeOut, attachArray } = JSON.parse(buffer.toString('utf8', 5, 5 + jsonLength))
        let prevAttachmentLength = 5 + jsonLength
        const queueMessage = new this(status, data, timeOut, ContentSchema)
        for (const [key, length] of attachArray) {
          queueMessage.addAttachment(key, buffer.subarray(prevAttachmentLength, prevAttachmentLength + length))
          prevAttachmentLength = prevAttachmentLength + length
        }

        return queueMessage
      } else if (buffer.toString('utf8', 0, 1) === '{') {
        return this.fromJSON(buffer.toString('utf8'))
      } else {
        throw new Error('Impossible to deserialize the message: unrecognized format')
      }
    } else {
      throw new Error('Impossible to deserialize the message: unknown content schema')
    }
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

export default QueueMessage
