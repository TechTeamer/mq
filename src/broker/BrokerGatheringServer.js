const GatheringServer = require('../GatheringServer')

class BrokerGatheringServer extends GatheringServer {
  /**
   * @param {QueueConnection} queueConnection
   * @param {Console} logger
   * @param {String} name
   * @param {Object} options
   */
  constructor (queueConnection, logger, name, options) {
    super(queueConnection, logger, name, options)

    /** @type {BrokerManager} broker */
    this.broker = null
  }

  /**
   * @param {BrokerManager} broker
   */
  registerBroker (broker) {
    this.broker = broker
  }

  /**
   * @param message
   * @param {String} message.channelName
   * @param {BrokerMessage} message.brokerMessage
   * @param {BrokerDetails} message.brokerDetails
   * @param {QueueMessage} request
   * @param {QueueResponse} response
   * @returns {Promise<void>}
   * @private
   */
  async _callback (message, request, response) {
    const {
      channelName,
      gatheringInfo,
      brokerDetails
    } = message || {}
    this._logger.debug(`Handling broker gathering announce in server ${this.name}`)

    try {
      return await this.broker.handleGatheringAnnouncement(channelName, gatheringInfo, brokerDetails, request, response)
    } catch (err) {
      this._logger.error(`Error processing event in broker server ${this.name}`, err)
      response.error('Handler failed on server side')
    }
  }
}

module.exports = BrokerGatheringServer
