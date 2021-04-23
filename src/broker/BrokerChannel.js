const { v4: uuid } = require('uuid')

/**
 * @class BrokerChannel
 * */
class BrokerChannel {
  /**
   * @typedef BrokerChannelOptions
   * @property {Console} logger
   * @property {BrokerDetails} broker
   * @property {BrokerPublisher} publisher
   * @property {BrokerQueueClient} queueClient
   * @property {BrokerRpcClient} rpcClient
   * @property {BrokerGatheringClient} gatheringClient
   * */

  /**
   * @param {string} channelName
   * @param {BrokerChannelOptions} options
   */
  constructor (channelName, options) {
    this._events = new Map()
    this._messages = new Map()
    this._endpoints = new Map()
    this._resourceProviders = new Map()

    const {
      logger,
      brokerDetails,
      publisher, queueClient, rpcClient, gatheringClient
    } = options || {}

    this._logger = logger || global.console

    this.name = channelName
    /** @type {BrokerDetails} broker */
    this.brokerDetails = brokerDetails

    /** @type {BrokerPublisher} publisher */
    this.publisher = publisher
    /** @type {BrokerQueueClient} queueClient */
    this.queueClient = queueClient
    /** @type {BrokerRpcClient} rpcClient */
    this.rpcClient = rpcClient
    /** @type {BrokerGatheringClient} gatheringClient */
    this.gatheringClient = gatheringClient
  }

  // PUBSUB EVENTS

  /**
   * @typedef BrokerEvent
   * @property {String} eventName
   * @property {*} data
   * */

  /**
   * @param {String} eventName
   * @param {*} data
   * @return {BrokerEvent}
   */
  createEvent (eventName, data) {
    return { eventName, data }
  }

  async emit (eventName, data, correlationId = null, timeOut = null, attachments = null) {
    const brokerEvent = this.createEvent(eventName, data)
    await this.publisher.sendEvent(this.brokerDetails, this.name, brokerEvent, {
      correlationId, timeOut, attachments
    })
  }

  /**
   * @param {String} eventName
   * @param {function(data:*, brokerDetails:BrokerDetails)} handlerCallback
   */
  on (eventName, handlerCallback) {
    const handlers = this._events.get(eventName) || []
    handlers.push(handlerCallback)
    this._events.set(eventName, handlers)
  }

  /**
   * @param {BrokerEvent} brokerEvent
   * @param {BrokerDetails} brokerDetails
   * @returns {Promise<void>}
   */
  async handleEvent (brokerEvent, brokerDetails) {
    const { eventName, data } = brokerEvent || {}

    try {
      const handlers = this._events.get(eventName)
      if (!Array.isArray(handlers)) {
        this._logger.debug(`Ignoring event from broker ${brokerDetails.brokerTag}: no handlers registered for event ${eventName} on channel ${this.name} by broker ${this.brokerDetails.brokerTag}`)
        return
      }

      this._logger.debug(`Handling event ${eventName} from broker ${brokerDetails.brokerTag} on channel ${this.name} by broker ${this.brokerDetails.brokerTag}`)

      for (const handlerCallback of handlers) {
        await handlerCallback(data, brokerDetails)
      }
    } catch (err) {
      this._logger.error(`Handler failed to process event '${eventName}' from broker ${brokerDetails.brokerTag} on channel '${this.name}' by broker ${this.brokerDetails.brokerTag}`, err)
      throw new Error('Handler failed to process broker event')
    }
  }

  // RPC COMMANDS

  /**
   * @typedef BrokerRequest
   * @property {String} commandName
   * @property {*} data
   * */

  /**
   * @param {String} commandName
   * @param {*} data
   * @return {BrokerRequest}
   */
  createRequest (commandName, data) {
    return { commandName, data }
  }

  async request (commandName, data, timeoutMs = null, attachments = null, resolveWithFullResponse = false) {
    const brokerRequest = this.createRequest(commandName, data)
    return this.rpcClient.sendRequest(this.brokerDetails, this.name, brokerRequest, {
      timeoutMs, attachments, resolveWithFullResponse
    })
  }

  /**
   * @param {string} commandName
   * @param {function(data:*, brokerDetails:BrokerDetails, queueMessage:QueueMessage, queueResponse:QueueResponse)} handlerCallback
   */
  endpoint (commandName, handlerCallback) {
    this._endpoints.set(commandName, handlerCallback)
  }

  /**
   * @param {BrokerRequest} brokerRequest
   * @param {BrokerDetails} brokerDetails
   * @param {QueueMessage} queueMessage
   * @param {QueueResponse} queueResponse
   * @returns {Promise}
   */
  async handleRequest (brokerRequest, brokerDetails, queueMessage, queueResponse) {
    const { commandName, data } = brokerRequest || {}

    try {
      const handlerCallback = this._endpoints.get(commandName)

      if (!handlerCallback) {
        this._logger.debug(`Requeue request from broker ${brokerDetails.brokerTag}: no handler registered for command ${commandName} on channel ${this.name} by broker ${this.brokerDetails.brokerTag}`)
        return queueMessage.requeue()
      }

      this._logger.debug(`Handling request ${commandName} from broker ${brokerDetails.brokerTag} on channel ${this.name} by broker ${this.brokerDetails.brokerTag}`)

      return await handlerCallback(data, brokerDetails, queueMessage, queueResponse)
    } catch (err) {
      this._logger.error(`Handler failed to process request '${commandName}' from broker ${brokerDetails.brokerTag} on channel '${this.name}' by broker ${this.brokerDetails.brokerTag}`, err)
      throw new Error('Handler failed to process broker request')
    }
  }

  // QUEUE MESSAGE

  /**
   * @typedef BrokerMessage
   * @property {String} subject
   * @property {*} data
   * */

  /**
   * @param {String} subject
   * @param {*} data
   * @return {BrokerMessage}
   */
  createMessage (subject, data) {
    return { subject, data }
  }

  async message (subject, data, correlationId = null, timeOut = null, attachments = null) {
    const brokerMessage = this.createMessage(subject, data)
    await this.queueClient.sendMessage(this.brokerDetails, this.name, brokerMessage, {
      correlationId, timeOut, attachments
    })
  }

  /**
   * @param {string} subject
   * @param {function(data:*, brokerDetails:BrokerDetails, queueMessage:QueueMessage)} handlerCallback
   */
  handle (subject, handlerCallback) {
    this._messages.set(subject, handlerCallback)
  }

  /**
   * @param {BrokerMessage} brokerMessage
   * @param {BrokerDetails} brokerDetails
   * @param {QueueMessage} queueMessage
   * @returns {Promise<void>}
   */
  async handleMessage (brokerMessage, brokerDetails, queueMessage) {
    const { subject, data } = brokerMessage || {}

    try {
      const handlerCallback = this._messages.get(subject)

      if (!handlerCallback) {
        this._logger.debug(`Requeue message from broker ${brokerDetails.brokerTag}: no handler registered for subject ${subject} on channel ${this.name} by broker ${this.brokerDetails.brokerTag}`)
        queueMessage.requeue()
        return
      }

      this._logger.debug(`Handling message ${subject} from broker ${brokerDetails.brokerTag} on channel ${this.name} by broker ${this.brokerDetails.brokerTag}`)

      await handlerCallback(data, brokerDetails, queueMessage)
    } catch (err) {
      this._logger.error(`Handler failed to process message '${subject}' from broker ${brokerDetails.brokerTag} on channel '${this.name}' by broker ${this.brokerDetails.brokerTag}`, err)
      throw new Error('Handler failed to process broker message')
    }
  }

  // GATHERING

  /**
   * @typedef BrokerGathering
   * @property {String} resource
   * @property {*} data
   * @property {String} gatheringId
   * */

  /**
   * @param {String} resource
   * @param {*} data
   * @return {BrokerGathering}
   */
  createGatheringInfo (resource, data) {
    return { resource, data }
  }

  /**
   * @param {String} resource
   * @param {*} data
   * @param {String} [correlationId]
   * @param {number|null} [timeOut]
   * @param {Map} [attachments]
   * @returns {Promise<*>}
   */
  async gather (resource, data, correlationId = null, timeOut = null, attachments = null) {
    const gatheringInfo = this.createGatheringInfo(resource, data)

    return this.gatheringClient.gatherResource(this.brokerDetails, this.name, gatheringInfo, {
      correlationId, timeOut, attachments
    })
  }

  /**
   * @param {string} resource
   * @param {function(data:*, brokerDetails:BrokerDetails, queueMessage:QueueMessage, queueResponse:QueueResponse)} resourceProviderCallback
   */
  resource (resource, resourceProviderCallback) {
    this._resourceProviders.set(resource, resourceProviderCallback)
  }

  /**
   * @param {BrokerGathering} gatheringInfo
   * @param {BrokerDetails} brokerDetails
   * @param {QueueMessage} request
   * @param {QueueResponse} response
   * @returns {Promise<void>}
   */
  async handleGatheringAnnouncement (gatheringInfo, brokerDetails, request, response) {
    const { resource, data } = gatheringInfo || {}

    try {
      const resourceProviderCallback = this._resourceProviders.get(resource)

      if (!resourceProviderCallback) {
        this._logger.debug(`Skip message from broker ${brokerDetails.brokerTag}: no resource provider registered for resource ${resource} on channel ${this.name} by broker ${this.brokerDetails.brokerTag}`)
        response.notFound(`No handler registered for resource '${resource}'`)
        return
      }

      this._logger.debug(`Handling message ${resource} from broker ${brokerDetails.brokerTag} on channel ${this.name} by broker ${this.brokerDetails.brokerTag}`)

      return await resourceProviderCallback(data, brokerDetails, request, response)
    } catch (err) {
      this._logger.error(`Handler failed to process message '${resource}' from broker ${brokerDetails.brokerTag} on channel '${this.name}' by broker ${this.brokerDetails.brokerTag}`, err)
      throw new Error('Handler failed to process broker message')
    }
  }
}

module.exports = BrokerChannel
