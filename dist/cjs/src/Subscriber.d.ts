export default Subscriber;
declare class Subscriber {
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
    _maxRetry: any;
    _timeoutMs: any;
    MessageModel: any;
    ContentSchema: any;
    _assertQueueOptions: any;
    _assertExchange: boolean;
    _assertExchangeOptions: any;
    _retryMap: Map<any, any>;
    actions: Map<any, any>;
    _callback(body: any, properties: any, request: any, msg: any): Promise<any>;
    /**
     * @param {string} action
     * @param {Function} handler
     */
    registerAction(action: string, handler: Function): void;
    /**
     * @return {Promise}
     */
    initialize(): Promise<any>;
    /**
     * @param channel
     * @param msg
     * @private
     */
    private _ack;
    /**
     * @param channel
     * @param msg
     * @private
     */
    private _nack;
    _parseMessage(msg: any): any;
    /**
     * @param channel
     * @param msg
     * @param request
     * @returns {boolean} true if too many retries reached
     * @private
     */
    private _handleMessageRetry;
    /**
     * @param channel
     * @param msg
     * @return {Promise}
     * @protected
     */
    protected _processMessage(channel: any, msg: any): Promise<any>;
    /**
     * @param {Function} cb
     */
    consume(cb: Function): void;
}
