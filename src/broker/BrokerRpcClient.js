const RPCClient = require('../RPCClient')

class BrokerRpcClient extends RPCClient {
  /**
   * @param {BrokerDetails} brokerDetails
   * @param {String} channelName
   * @param {BrokerRequest} brokerRequest
   * @param queue
   * @returns {Promise}
   */
  async sendRequest (brokerDetails, channelName, brokerRequest, queue) {
    const {
      timeoutMs = null,
      attachments = null,
      resolveWithFullResponse = false
    } = queue || {}
    const message = {
      channelName,
      brokerRequest,
      brokerDetails
    }

    return this.call(message, timeoutMs, attachments, resolveWithFullResponse)
  }
}

module.exports = BrokerRpcClient
