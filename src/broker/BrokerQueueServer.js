const QueueServer = require('../QueueServer')

class BrokerQueueServer extends QueueServer {
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
   * @param {Object} properties
   * @param {QueueMessage} request
   * @returns {Promise<void>}
   * @private
   */
  async _callback (message, properties, request) {
    const {
      channelName,
      brokerMessage,
      brokerDetails
    } = message || {}

    this._logger.debug(`Handling broker message in queue server ${this.name}`)

    try {
      await this.broker.handleMessage(channelName, brokerMessage, brokerDetails, request)
    } catch (err) {
      this._logger.error(`Error processing message in broker queue server ${this.name}`, err)
    }
  }
}

module.exports = BrokerQueueServer
