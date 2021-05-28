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

  _messageTag (messageName) {
    return `${this.name}/${messageName} (broker:${this.brokerDetails.brokerTag})`
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
    this._logger.debug(`PUBSUB event emitted: ${this._messageTag(eventName)}`)
  }

  /**
   * @param {String} eventName
   * @param {function(data:*, brokerDetails:BrokerDetails)} handlerCallback
   */
  on (eventName, handlerCallback) {
    const handlers = this._events.get(eventName) || []
    handlers.push(handlerCallback)
    this._events.set(eventName, handlers)
    this._logger.debug(`PUBSUB event listening: ${this._messageTag(eventName)}`)
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
        this._logger.debug(`PUBSUB event ignored: ${this._messageTag(eventName)} from broker ${brokerDetails.brokerTag}: no handlers registered for event`)
        return
      }

      for (const handlerCallback of handlers) {
        await handlerCallback(data, brokerDetails)
      }

      this._logger.debug(`PUBSUB event handled: ${this._messageTag(eventName)} from broker ${brokerDetails.brokerTag}`)
    } catch (err) {
      this._logger.error(`PUBSUB event unprocessed: ${this._messageTag(eventName)} from broker ${brokerDetails.brokerTag}: Handler failed to process event`, err)
      throw new Error('Handler failed to process PUBSUB broker event')
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
    const result = await this.rpcClient.sendRequest(this.brokerDetails, this.name, brokerRequest, {
      timeoutMs, attachments, resolveWithFullResponse
    })
    this._logger.debug(`RPC request sent: ${this._messageTag(commandName)}`)
    return result
  }

  /**
   * @param {string} commandName
   * @param {function(data:*, brokerDetails:BrokerDetails, queueMessage:QueueMessage, queueResponse:QueueResponse)} handlerCallback
   */
  endpoint (commandName, handlerCallback) {
    this._endpoints.set(commandName, handlerCallback)
    this._logger.debug(`RPC request listening: ${this._messageTag(commandName)}`)
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

    const handlerCallback = this._endpoints.get(commandName)

    if (!handlerCallback) {
      this._logger.error(`RPC request rejected: ${this._messageTag(commandName)} from broker ${brokerDetails.brokerTag}: no handler registered for command`)
      throw new Error('No handler for command')
    }

    try {
      const results = await handlerCallback(data, brokerDetails, queueMessage, queueResponse)
      this._logger.debug(`RPC request handling: ${this._messageTag(commandName)} from broker ${brokerDetails.brokerTag}`)
      return results
    } catch (err) {
      this._logger.error(`RPC request failed: ${this._messageTag(commandName)} from broker ${brokerDetails.brokerTag}: Handler failed to process request`, err)
      throw new Error('Handler failed to process RPC broker request')
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
    this._logger.debug(`QUEUE message sent: ${this._messageTag(subject)}`)
  }

  /**
   * @param {string} subject
   * @param {function(data:*, brokerDetails:BrokerDetails, queueMessage:QueueMessage)} handlerCallback
   */
  handle (subject, handlerCallback) {
    this._messages.set(subject, handlerCallback)
    this._logger.debug(`QUEUE message listening: ${this._messageTag(subject)}`)
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
        this._logger.debug(`QUEUE message ignored: ${this._messageTag(subject)} from broker ${brokerDetails.brokerTag}: no handler registered for subject`)
        return
      }

      this._logger.debug(`QUEUE message handling: ${this._messageTag(subject)} from broker ${brokerDetails.brokerTag}`)

      await handlerCallback(data, brokerDetails, queueMessage)
    } catch (err) {
      this._logger.error(`QUEUE message failed: ${this._messageTag(subject)} from broker ${brokerDetails.brokerTag}: Handler failed to process message`, err)
      throw new Error('Handler failed to process QUEUE broker message')
    }
  }

  // GATHERING

  /**
   * @typedef BrokerGathering
   * @property {String} resource
   * @property {*} data
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

    this._logger.debug(`GATHERING resource requesting: ${this._messageTag(resource)}`)

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
    this._logger.debug(`GATHERING resource listening: ${this._messageTag(resource)}`)
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
        this._logger.debug(`GATHERING resource ignored: ${this._messageTag(resource)}: no resource provider registered for resource`)
        response.notFound(`No handler registered for resource '${resource}'`)
        return
      }

      const result = await resourceProviderCallback(data, brokerDetails, request, response)

      this._logger.debug(`GATHERING resource handled: ${this._messageTag(resource)} from broker ${brokerDetails.brokerTag}`)

      return result
    } catch (err) {
      this._logger.error(`GATHERING resource failed: ${this._messageTag(resource)} from broker ${brokerDetails.brokerTag}: Handler failed to process message`, err)
      throw new Error('Handler failed to process GATHERING broker message')
    }
  }
}

module.exports = BrokerChannel
