const GatheringClient = require('../GatheringClient')

class BrokerGatheringClient extends GatheringClient {
  /**
   * @param {BrokerDetails} brokerDetails
   * @param {String} channelName
   * @param {BrokerGathering} gatheringInfo
   * @param queue
   * @returns {Promise}
   */
  async gatherResource (brokerDetails, channelName, gatheringInfo, queue) {
    const {
      timeOut = null,
      attachments = null,
      resolveWithFullResponse = false,
      acceptNotFound = true
    } = queue || {}
    const message = {
      channelName,
      gatheringInfo,
      brokerDetails
    }

    return this.request(message, timeOut, attachments, resolveWithFullResponse, acceptNotFound)
  }
}

module.exports = BrokerGatheringClient
