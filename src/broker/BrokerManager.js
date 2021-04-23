const BrokerChannel = require('./BrokerChannel')
const BrokerPublisher = require('./BrokerPublisher')
const BrokerQueueClient = require('./BrokerQueueClient')
const BrokerQueueServer = require('./BrokerQueueServer')
const BrokerRpcClient = require('./BrokerRpcClient')
const BrokerRpcServer = require('./BrokerRpcServer')
const BrokerSubscriber = require('./BrokerSubscriber')
const BrokerGatheringServer = require('./BrokerGatheringServer')
const BrokerGatheringClient = require('./BrokerGatheringClient')

/**
 * @class BrokerDetails
 * */
class BrokerManager {
  /**
   * @param {String} name
   * @param {Object} [options]
   * @param {Console} [options.logger]
   * @param {QueueManager} [options.queueManager]
   * @param {String} [options.type]
   * @param {String|Number} [options.id]
   */
  constructor (name, options) {
    /** @type {String} name */
    this.name = name

    const {
      queueManager,
      logger,
      type,
      id
    } = options || {}

    /** @type {QueueManager} queueManager */
    this.queueManager = queueManager

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
   * @typedef BrokerCreateChannelOptions
   * @property {String} publisher
   * @property {String} subscriber
   * @property {String} queueClient
   * @property {String} queueServer
   * @property {String} rpcClient
   * @property {String} rpcServer
   * @property {function():BrokerPublisher} BrokerPublisher
   * @property {function():BrokerSubscriber} BrokerSubscriber
   * @property {function():BrokerQueueClient} BrokerQueueClient
   * @property {function():BrokerQueueServer} BrokerQueueServer
   * @property {function():BrokerRpcClient} BrokerRpcClient
   * @property {function():BrokerRpcServer} BrokerRpcServer
   * @property {function():BrokerGatheringServer} BrokerGatheringServer
   * @property {function():BrokerGatheringClient} BrokerGatheringClient
   * */

  /**
   * @param {String} channelName
   * @param {BrokerCreateChannelOptions} channelOptions
   * @return {BrokerChannel}
   */
  createChannel (channelName, channelOptions = {}) {
    const publisher = this.queueManager.getPublisher(channelOptions.publisher || `pubsub-${this.name}-${channelName}`, channelOptions.BrokerPublisher || BrokerPublisher)
    const subscriber = this.queueManager.getSubscriber(channelOptions.subscriber || `pubsub-${this.name}-${channelName}`, channelOptions.BrokerSubscriber || BrokerSubscriber)
    const queueClient = this.queueManager.getQueueClient(channelOptions.queueClient || `queue-${this.name}-${channelName}`, channelOptions.BrokerQueueClient || BrokerQueueClient)
    const queueServer = this.queueManager.getQueueServer(channelOptions.queueServer || `queue-${this.name}-${channelName}`, channelOptions.BrokerQueueServer || BrokerQueueServer)
    const rpcClient = this.queueManager.getRPCClient(channelOptions.rpcClient || `rpc-${this.name}-${channelName}`, channelOptions.BrokerRpcClient || BrokerRpcClient)
    const rpcServer = this.queueManager.getRPCServer(channelOptions.rpcServer || `rpc-${this.name}-${channelName}`, channelOptions.BrokerRpcServer || BrokerRpcServer)
    const gatheringClient = this.queueManager.getGatheringClient(channelOptions.gatheringClient || `gathering-${this.name}-${channelName}`, channelOptions.BrokerGatheringServer || BrokerGatheringServer)
    const gatheringServer = this.queueManager.getGatheringServer(channelOptions.gatheringServer || `gathering-${this.name}-${channelName}`, channelOptions.BrokerGatheringClient || BrokerGatheringClient)

    subscriber.registerBroker(this)
    queueServer.registerBroker(this)
    rpcServer.registerBroker(this)
    gatheringServer.registerBroker(this)

    const brokerChannel = new BrokerChannel(channelName, {
      publisher,
      queueClient,
      rpcClient,
      gatheringClient,
      logger: this._logger,
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
   * @param {BrokerGathering} gatheringInfo
   * @param {BrokerDetails} brokerDetails
   * @param {QueueMessage} request
   * @param {QueueResponse} response
   * @returns {Promise<void>}
   */
  async handleGatheringAnnouncement (channelName, gatheringInfo, brokerDetails, request, response) {
    const brokerChannel = this.getChannel(channelName)
    if (!brokerChannel) {
      throw new Error(`Broker failed for event: Channel not found '${channelName}' on broker ${this.brokerTag}`)
    }

    try {
      return await brokerChannel.handleGatheringAnnouncement(gatheringInfo, brokerDetails, request, response)
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

  /**
   * @param {String} channelName
   * @param {BrokerGathering} resourceResponse
   * @param {BrokerDetails} brokerDetails
   * @param {QueueMessage} queueMessage
   * @returns {Promise<void>}
   */
  async handleResourceResponse (channelName, resourceResponse, brokerDetails, queueMessage) {
    const brokerChannel = this.getChannel(channelName)
    if (!brokerChannel) {
      throw new Error(`Broker failed for message: Channel not found '${channelName}' on broker ${this.brokerTag}`)
    }

    try {
      return await brokerChannel.handleResourceResponse(resourceResponse, brokerDetails, queueMessage)
    } catch (err) {
      this._logger.error(`Channel failed to process broker message on broker '${this.brokerTag}'`, err)
      throw new Error('Channel failed to process broker message')
    }
  }
}

module.exports = BrokerManager
