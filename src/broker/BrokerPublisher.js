const Publisher = require('../Publisher')

class BrokerPublisher extends Publisher {
  /**
   * @param {BrokerDetails} brokerDetails
   * @param {String} channelName
   * @param {BrokerEvent} brokerEvent
   * @param queue
   * @returns {Promise}
   */
  async sendEvent (brokerDetails, channelName, brokerEvent, queue) {
    const {
      correlationId = null,
      timeOut = null,
      attachments = null
    } = queue || {}
    const message = {
      channelName,
      brokerEvent,
      brokerDetails
    }

    return this.send(message, correlationId, timeOut, attachments)
  }
}

module.exports = BrokerPublisher
