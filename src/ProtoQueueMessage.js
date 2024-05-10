import QueueMessage from './QueueMessage.js'
class ProtoQueueMessage extends QueueMessage {
  serialize () {
    const errorMessage = this.ContentSchema.verify(this.data)
    if (errorMessage) {
      throw new Error(`Error verifying ProtoQueueMessage data: ${errorMessage}`)
    }
    const message = this.ContentSchema.create(this.data)
    return this.ContentSchema.encode(message).finish()
  }

  static getUnserializeOptions () {
    return {
      enums: String,
      longs: Number,
      bytes: Buffer,
      defaults: true,
      arrays: true,
      objects: true,
      oneofs: true // includes virtual oneof fields set to the present field's name
    }
  }

  static unserialize (buffer, ContentSchema) {
    try {
      const message = ContentSchema.decode(buffer)
      const data = ContentSchema.toObject(message, this.getUnserializeOptions())
      return new ProtoQueueMessage('ok', data, null, ContentSchema)
    } catch (err) {
      return new ProtoQueueMessage('error', `Cannot decode protobuf: ${err.message}`, null, ContentSchema)
    }
  }
}
export default ProtoQueueMessage
