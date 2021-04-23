const Subscriber = require('../Subscriber')

class BrokerSubscriber extends Subscriber {
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
   * @param {BrokerEvent} message.brokerEvent
   * @param {BrokerDetails} message.brokerDetails
   * @returns {Promise<void>}
   * @private
   */
  async _callback (message) {
    const {
      channelName,
      brokerEvent,
      brokerDetails
    } = message || {}

    this._logger.debug(`Handling broker event in subscriber ${this.name}`)

    try {
      await this.broker.handleEvent(channelName, brokerEvent, brokerDetails)
    } catch (err) {
      this._logger.error(`Error processing event in broker subscriber ${this.name}`, err)
    }
  }
}

module.exports = BrokerSubscriber
