export default Publisher;
declare class Publisher {
    /**
     * @param {QueueConnection} queueConnection
     * @param {Console} logger
     * @param {String} exchange
     * @param {Object} options
     */
    constructor(queueConnection: QueueConnection, logger: Console, exchange: string, options?: Object);
    _connection: QueueConnection;
    _logger: Console;
    exchange: string;
    routingKey: string;
    options: Object;
    _assertExchange: boolean;
    _assertExchangeOptions: any;
    MessageModel: any;
    ContentSchema: any;
    /**
     * Overridden in queueClient to assertQueue instead of exchange
     *
     * @param channel
     * @returns {Promise}
     */
    assertExchangeOrQueue(channel: any): Promise<any>;
    initialize(): Promise<void>;
    /**
     * @param {String} action
     * @param {*} data
     * @param {String} [correlationId]
     * @param {Number} [timeOut]
     * @param {Map} [attachments]
     * @return {Promise}
     * */
    sendAction(action: string, data: any, correlationId?: string | undefined, timeOut?: number | undefined, attachments?: Map<any, any> | undefined): Promise<any>;
    /**
     * @param {*} message
     * @param {String} [correlationId]
     * @param {Number} [timeOut]
     * @param {Map} [attachments]
     * @param {object} [sendOptions]
     * @return {Promise}
     */
    send(message: any, correlationId?: string | undefined, timeOut?: number | undefined, attachments?: Map<any, any> | undefined, sendOptions?: object | undefined): Promise<any>;
}
