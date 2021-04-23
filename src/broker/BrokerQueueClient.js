const QueueClient = require('../QueueClient')

class BrokerQueueClient extends QueueClient {
  /**
   * @param {BrokerDetails} brokerDetails
   * @param {String} channelName
   * @param {BrokerMessage} brokerMessage
   * @param queue
   * @returns {Promise}
   */
  async sendMessage (brokerDetails, channelName, brokerMessage, queue) {
    const {
      correlationId = null,
      timeOut = null,
      attachments = null
    } = queue || {}
    const message = {
      channelName,
      brokerMessage,
      brokerDetails
    }

    return this.send(message, correlationId, timeOut, attachments)
  }
}

module.exports = BrokerQueueClient
