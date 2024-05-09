export default RPCServer;
/**
 * @class RPCServer
 * */
declare class RPCServer {
    /**
     * @param {QueueConnection} queueConnection
     * @param {Console} logger
     * @param {String} rpcName
     * @param {Object} options
     */
    constructor(queueConnection: QueueConnection, logger: Console, rpcName: string, options?: Object);
    _connection: QueueConnection;
    _logger: Console;
    name: string;
    _assertQueue: boolean;
    _assertQueueOptions: any;
    _bindDirectExchangeName: any;
    _exchangeOptions: any;
    _prefetchCount: any;
    _timeoutMs: any;
    RequestModel: any;
    ResponseModel: any;
    RequestContentSchema: any;
    ResponseContentSchema: any;
    actions: Map<any, any>;
    /**
     * @param {*} body
     * @param {QueueMessage} request
     * @param {QueueResponse} response
     * @param {Object} msg
     * @protected
     * @returns {Promise}
     */
    protected _callback(body: any, request: QueueMessage, response: QueueResponse, msg: Object): Promise<any>;
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
     * @param ch
     * @param msg
     * @private
     */
    private _ack;
    _createResponseTimeoutReply(_msg: any, _request: any): any;
    onResponseTimeout(ch: any, msg: any, request: any): void;
    handleResponseTimeout(ch: any, msg: any, request: any): void;
    _createRequestErrorReply(_msg: any, _request: any): any;
    onRequestError(ch: any, msg: any, request: any): void;
    handleRequestError(ch: any, msg: any, request: any): void;
    _createResponseErrorReply(_msg: any, _error: any, _request: any): any;
    onResponseError(ch: any, msg: any, error: any, request: any): void;
    handleResponseError(ch: any, msg: any, error: any, request: any): void;
    _createReply(_msg: any, answer: any): any;
    /**
     * @param ch
     * @param msg
     * @return {Promise}
     * @private
     */
    private _processMessage;
    _send(channel: any, replyTo: any, data: any, options: any): void;
    /**
     * @param {Function} cb
     */
    consume(cb: Function): void;
}
import QueueMessage from './QueueMessage.js';
import QueueResponse from './QueueResponse.js';
