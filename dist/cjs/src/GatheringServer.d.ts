export default GatheringServer;
declare class GatheringServer {
    /**
     * @param {QueueConnection} queueConnection
     * @param {Console} logger
     * @param {String} name
     * @param {Object} options
     */
    constructor(queueConnection: QueueConnection, logger: Console, name: string, options?: Object);
    _connection: QueueConnection;
    _logger: Console;
    name: string;
    statusQueue: string;
    _prefetchCount: any;
    _responseTimeoutMs: any;
    _assertExchange: boolean;
    _assertQueueOptions: any;
    _assertExchangeOptions: any;
    actions: Map<any, any>;
    initialize(): Promise<void>;
    /**
     * @param {*} msg
     * @param {QueueMessage} request
     * @param {QueueResponse} response
     * @protected
     * @returns {Promise}
     */
    protected _callback(msg: any, request: QueueMessage, response: QueueResponse): Promise<any>;
    /**
     * @param {string} action
     * @param {Function} handler
     */
    registerAction(action: string, handler: Function): void;
    /**
     * @param {Function} cb
     */
    consume(cb: Function): void;
    /**
     * @param channel
     * @param msg
     * @return {Promise}
     * @private
     */
    private _handleGatheringAnnouncement;
    _sendStatus(channel: any, replyTo: any, correlationId: any, status: any, message?: string): void;
    /**
     * @returns {boolean} is valid
     */
    verifyMessage(channel: any, msg: any): boolean;
    /**
     * @param channel
     * @param msg
     * @returns {{request: QueueMessage, isValid: boolean, replyTo: *, correlationId: *}}
     */
    unserializeMessage(channel: any, msg: any): {
        request: QueueMessage;
        isValid: boolean;
        replyTo: any;
        correlationId: any;
    };
    /**
     * @param ch
     * @param msg
     * @private
     */
    private _ack;
    /**
     * @param channel
     * @param msg
     * @param [requeue=true]
     * @private
     */
    private _nack;
}
import QueueMessage from './QueueMessage.js';
import QueueResponse from './QueueResponse.js';
