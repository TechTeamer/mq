const BrokerChannel = require('./BrokerChannel')

/**
 * @class BrokerDetails
 * */
class BrokerManager {
  /**
   * @param {String} name
   * @param {Object} [options]
   * @param {Console} [options.logger]
   * @param {String} [options.type]
   * @param {String|Number} [options.id]
   */
  constructor (name, options) {
    /** @type {String} name */
    this.name = name

    const {
      logger,
      type,
      id
    } = options || {}

    /** @type {String} type */
    this.type = type || ''

    /** @type {String|Number} id */
    this.id = id || null

    /** @type {Console} _logger */
    this._logger = logger || global.console

    /** @type {Map<string, BrokerChannel>} _channels */
    this._channels = new Map()
  }

  /**
   * @typedef BrokerDetails
   * @property {String} brokerName
   * @property {String} brokerType
   * @property {String|Number} brokerId
   * @property {String} brokerTag
   * */

  /**
   * @returns {BrokerDetails}
   */
  get brokerDetails () {
    return {
      brokerName: this.name,
      brokerType: this.type,
      brokerId: this.id,
      brokerTag: this.brokerTag
    }
  }

  /**
   * @returns {string}
   */
  get brokerTag () {
    return `${this.name}:${this.type || 'notype'}:${this.id || 'noid'}`
  }

  /**
   * @param {BrokerDetails} brokerDetails
   */
  matchDetails (brokerDetails) {
    return this.name === brokerDetails.brokerName &&
      ((!brokerDetails.brokerType && !this.type) || brokerDetails.brokerType === this.type) &&
      ((!brokerDetails.brokerId && !this.id) || brokerDetails.brokerId === this.id)
  }

  /**
   * @param {String} channelName
   * @param {BrokerChannelOptions} channelOptions
   * @return {BrokerChannel}
   */
  createChannel (channelName, channelOptions = {}) {
    const brokerChannel = new BrokerChannel(channelName, {
      ...channelOptions,
      brokerDetails: this.brokerDetails
    })

    this.addChannel(brokerChannel)

    return brokerChannel
  }

  /**
   * @param {BrokerChannel} brokerChannel
   */
  addChannel (brokerChannel) {
    this._channels.set(brokerChannel.name, brokerChannel)
  }

  /**
   * @param {String} channelName
   * @return {BrokerChannel}
   */
  getChannel (channelName) {
    return this._channels.get(channelName)
  }

  /**
   * @param {String} channelName
   * @return {Boolean}
   */
  hasChannel (channelName) {
    return this._channels.has(channelName)
  }

  /**
   * @param {String} channelName
   * @param {BrokerEvent} brokerEvent
   * @param {BrokerDetails} brokerDetails
   * @returns {Promise<void>}
   */
  async handleEvent (channelName, brokerEvent, brokerDetails) {
    const brokerChannel = this.getChannel(channelName)
    if (!brokerChannel) {
      throw new Error(`Broker failed for event: Channel not found '${channelName}' on broker ${this.brokerTag}`)
    }

    try {
      await brokerChannel.handleEvent(brokerEvent, brokerDetails)
    } catch (err) {
      this._logger.error(`Channel failed to process broker event on broker '${this.brokerTag}'`, err)
      throw new Error('Channel failed to process broker event')
    }
  }

  /**
   * @param {String} channelName
   * @param {BrokerRequest} brokerRequest
   * @param {BrokerDetails} brokerDetails
   * @param {QueueMessage} queueMessage
   * @param {QueueResponse} queueResponse
   * @returns {Promise}
   */
  async handleRequest (channelName, brokerRequest, brokerDetails, queueMessage, queueResponse) {
    const brokerChannel = this.getChannel(channelName)
    if (!brokerChannel) {
      throw new Error(`Broker failed for request: Channel not found '${channelName}' on broker ${this.brokerTag}`)
    }

    try {
      return await brokerChannel.handleRequest(brokerRequest, brokerDetails, queueMessage, queueResponse)
    } catch (err) {
      this._logger.error(`Channel failed to process broker request on broker '${this.brokerTag}'`, err)
      throw new Error('Channel failed to process broker request')
    }
  }

  /**
   * @param {String} channelName
   * @param {BrokerMessage} brokerMessage
   * @param {BrokerDetails} brokerDetails
   * @param {QueueMessage} queueMessage
   * @returns {Promise<void>}
   */
  async handleMessage (channelName, brokerMessage, brokerDetails, queueMessage) {
    const brokerChannel = this.getChannel(channelName)
    if (!brokerChannel) {
      throw new Error(`Broker failed for message: Channel not found '${channelName}' on broker ${this.brokerTag}`)
    }

    try {
      return await brokerChannel.handleMessage(brokerMessage, brokerDetails, queueMessage)
    } catch (err) {
      this._logger.error(`Channel failed to process broker message on broker '${this.brokerTag}'`, err)
      throw new Error('Channel failed to process broker message')
    }
  }
}

module.exports = BrokerManager
