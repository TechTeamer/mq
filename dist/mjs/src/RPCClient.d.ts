export default RPCClient;
/**
 * A queue handler
 * @class RPCClient
 * */
declare class RPCClient {
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
    _replyQueue: any;
    _correlationIdMap: Map<any, any>;
    _assertReplyQueue: boolean;
    _assertReplyQueueOptions: any;
    _bindDirectExchangeName: any;
    _exchangeOptions: any;
    _rpcQueueMaxSize: any;
    _rpcTimeoutMs: any;
    RequestMessageModel: any;
    ResponseMessageModel: any;
    RequestContentSchema: any;
    ResponseContentSchema: any;
    initialize(): Promise<void>;
    /**
     * @param {Function} resolve
     * @param {Function} reject
     * @param {Number} timeoutMs
     * @param {boolean} resolveWithFullResponse
     * @return {Number} correlation id
     * @private
     */
    private _registerMessage;
    /**
     * @param {*} message
     * @param {Number} timeoutMs
     * @param {Map} attachments
     * @param {Boolean} [resolveWithFullResponse=false]
     * @param {Object} sendOptions
     * @return {Promise<QueueMessage|*>}
     * */
    call(message: any, timeoutMs?: number, attachments?: Map<any, any>, resolveWithFullResponse?: boolean | undefined, sendOptions?: Object): Promise<QueueMessage | any>;
    /**
     * @param {String} action
     * @param {*} data
     * @param {Number|null} timeoutMs
     * @param {Map|null} attachments
     * @return {Promise}
     * */
    callAction(action: string, data: any, timeoutMs?: number | null, attachments?: Map<any, any> | null): Promise<any>;
    /**
     * Returns a promise that resolves to the reply queue's name.
     * @return Promise<String>
     * @private
     * */
    private _getReplyQueue;
    /**
     * This method is called when consuming replies
     * @param {Object} reply see: http://www.squaremobius.net/amqp.node/channel_api.html#channel_consume
     * @private
     * */
    private _onReply;
}
import QueueMessage from './QueueMessage.js';
