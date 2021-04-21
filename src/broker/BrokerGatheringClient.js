const GatheringClient = require('../GatheringClient')

class BrokerGatheringClient extends GatheringClient {
  // /**
  //  * @param {BrokerDetails} brokerDetails
  //  * @param {String} channelName
  //  * @param {BrokerGathering} resourceResponse
  //  * @param queue
  //  * @returns {Promise}
  //  */
  // async gatherResource (brokerDetails, channelName, resourceResponse, queue) {
  //   const {
  //     correlationId = null,
  //     timeOut = null,
  //     attachments = null
  //   } = queue || {}
  //   const message = {
  //     channelName,
  //     resourceResponse,
  //     brokerDetails
  //   }
  //
  //   return this.request(message, correlationId, timeOut, attachments)
  // }

  /**
   * @param {BrokerDetails} brokerDetails
   * @param {String} channelName
   * @param {BrokerGathering} gatheringInfo
   * @param queue
   * @returns {Promise}
   */
  async gatherResource (brokerDetails, channelName, gatheringInfo, queue) {
    const {
      correlationId = null,
      timeOut = null,
      attachments = null
    } = queue || {}
    const message = {
      channelName,
      gatheringInfo,
      brokerDetails
    }

    return this.request(message, correlationId, timeOut, attachments)
  }
}

module.exports = BrokerGatheringClient
