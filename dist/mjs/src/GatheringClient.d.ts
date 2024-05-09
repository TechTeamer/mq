export default GatheringClient;
declare class GatheringClient {
    /**
     * @param {QueueConnection} queueConnection
     * @param {Console} logger
     * @param {String} name
     * @param {Object} [options]
     */
    constructor(queueConnection: QueueConnection, logger: Console, name: string, options?: Object | undefined);
    _connection: QueueConnection;
    _logger: Console;
    name: string;
    statusQueue: string;
    _correlationIdMap: Map<any, any>;
    _replyQueue: string;
    _rpcQueueMaxSize: any;
    _rpcTimeoutMs: any;
    _gatheringServerCount: any;
    _assertExchange: boolean;
    _assertQueueOptions: any;
    _assertExchangeOptions: any;
    initialize(): Promise<void>;
    isValidReply(reply: any): boolean;
    /**
     * @param {*} data
     * @param {Number} timeoutMs
     * @param {Map} attachments
     * @param {Boolean} [resolveWithFullResponse=false]
     * @param {Boolean} [acceptNotFound=true]
     * @return {Promise<QueueMessage|*>}
     * */
    request(data: any, timeoutMs?: number, attachments?: Map<any, any>, resolveWithFullResponse?: boolean | undefined, acceptNotFound?: boolean | undefined): Promise<QueueMessage | any>;
    requestAction(action: any, data: any, timeoutMs?: null, attachments?: null, resolveWithFullResponse?: boolean, acceptNotFound?: boolean): Promise<any>;
    /**
     * @param {Function} resolve
     * @param {Function} reject
     * @param {Number} timeoutMs
     * @param {boolean} resolveWithFullResponse
     * @param {boolean} acceptNotFound
     * @param {Number} serverCount
     * @return {Number} correlation id
     * @private
     */
    private _registerMessage;
    _handleGatheringResponse(reply: any): void;
    _handleStatusResponse(reply: any): void;
}
import QueueMessage from './QueueMessage.js';
