const RPCServer = require('../RPCServer')

class BrokerRpcServer extends RPCServer {
  constructor (queueConnection, logger, rpcName, options = {}) {
    super(queueConnection, logger, rpcName, options)

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
   * @param {BrokerRequest} message.brokerRequest
   * @param {BrokerDetails} message.brokerDetails
   * @param {QueueMessage} request
   * @param {QueueResponse} response
   * @returns {Promise<void>}
   * @private
   */
  async _callback (message, request, response) {
    const {
      channelName,
      brokerRequest,
      brokerDetails
    } = message || {}

    this._logger.debug(`Handling broker request in rpc server ${this.name}`)

    try {
      return await this.broker.handleRequest(channelName, brokerRequest, brokerDetails, request, response)
    } catch (err) {
      this._logger.error(`Error processing request in broker rpc server ${this.name}`, err)
    }
  }
}

module.exports = BrokerRpcServer
