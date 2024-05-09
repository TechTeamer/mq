"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const QueueMessage_js_1 = __importDefault(require("./QueueMessage.js"));
/**
 * A queue handler
 * @class RPCClient
 * */
class RPCClient {
    /**
     * @param {QueueConnection} queueConnection
     * @param {Console} logger
     * @param {String} rpcName
     * @param {Object} options
     */
    constructor(queueConnection, logger, rpcName, options = {}) {
        const { queueMaxSize, timeoutMs, RequestMessageModel = QueueMessage_js_1.default, ResponseMessageModel = QueueMessage_js_1.default, RequestContentSchema = JSON, ResponseContentSchema = JSON, replyQueueName = '', assertReplyQueue = true, assertReplyQueueOptions = {}, bindDirectExchangeName = null, exchangeOptions = {} } = options;
        this._connection = queueConnection;
        this._logger = logger;
        this.name = rpcName;
        this._replyQueue = replyQueueName;
        this._correlationIdMap = new Map();
        this._assertReplyQueue = assertReplyQueue === true;
        this._assertReplyQueueOptions = Object.assign({ exclusive: true, autoDelete: true }, assertReplyQueueOptions);
        this._bindDirectExchangeName = bindDirectExchangeName;
        this._exchangeOptions = exchangeOptions;
        this._rpcQueueMaxSize = queueMaxSize;
        this._rpcTimeoutMs = timeoutMs;
        this.RequestMessageModel = RequestMessageModel;
        this.ResponseMessageModel = ResponseMessageModel;
        this.RequestContentSchema = RequestContentSchema;
        this.ResponseContentSchema = ResponseContentSchema;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            const channel = yield this._connection.getChannel();
            yield this._getReplyQueue(channel);
        });
    }
    /**
     * @param {Function} resolve
     * @param {Function} reject
     * @param {Number} timeoutMs
     * @param {boolean} resolveWithFullResponse
     * @return {Number} correlation id
     * @private
     */
    _registerMessage(resolve, reject, timeoutMs, resolveWithFullResponse) {
        let correlationId;
        let timeoutId;
        let timedOut = false;
        do {
            correlationId = (0, uuid_1.v4)();
        } while (this._correlationIdMap.has(correlationId));
        this._correlationIdMap.set(correlationId, {
            resolveWithFullResponse,
            resolve: (result) => {
                if (!timedOut) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                    resolve(result);
                }
            },
            reject: (err) => {
                if (!timedOut) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                    reject(err);
                }
            }
        });
        timeoutId = setTimeout(() => {
            timedOut = true;
            if (this._correlationIdMap.has(correlationId)) {
                this._correlationIdMap.delete(correlationId);
                reject(new Error('RPCCLIENT MESSAGE TIMEOUT ' + this.name));
            }
        }, timeoutMs || this._rpcTimeoutMs);
        return correlationId;
    }
    /**
     * @param {*} message
     * @param {Number} timeoutMs
     * @param {Map} attachments
     * @param {Boolean} [resolveWithFullResponse=false]
     * @param {Object} sendOptions
     * @return {Promise<QueueMessage|*>}
     * */
    call(message_1) {
        return __awaiter(this, arguments, void 0, function* (message, timeoutMs = null, attachments = null, resolveWithFullResponse = false, sendOptions = {}) {
            try {
                if (this._correlationIdMap.size > this._rpcQueueMaxSize) {
                    throw new Error('RPCCLIENT QUEUE FULL ' + this.name);
                }
                const channel = yield this._connection.getChannel();
                let param;
                try {
                    param = new this.RequestMessageModel('ok', message, timeoutMs, this.RequestContentSchema);
                    if (attachments instanceof Map) {
                        for (const [key, value] of attachments) {
                            param.addAttachment(key, value);
                        }
                    }
                }
                catch (err) {
                    this._logger.error('CANNOT SEND RPC CALL', this.name, err);
                    throw err;
                }
                return yield new Promise((resolve, reject) => {
                    const correlationId = this._registerMessage(resolve, reject, timeoutMs, resolveWithFullResponse);
                    const options = Object.assign({ correlationId, replyTo: this._replyQueue }, sendOptions || {});
                    channel.sendToQueue(this.name, param.serialize(), options);
                });
            }
            catch (err) {
                this._logger.error('RPCCLIENT: cannot make rpc call', err);
                throw new Error(`RPCCLIENT: cannot make rpc call ${err}`);
            }
        });
    }
    /**
     * @param {String} action
     * @param {*} data
     * @param {Number|null} timeoutMs
     * @param {Map|null} attachments
     * @return {Promise}
     * */
    callAction(action, data, timeoutMs = null, attachments = null) {
        return this.call({ action, data }, timeoutMs, attachments);
    }
    /**
     * Returns a promise that resolves to the reply queue's name.
     * @return Promise<String>
     * @private
     * */
    _getReplyQueue(ch) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this._assertReplyQueue) {
                    const assertResult = yield ch.assertQueue(this._replyQueue, this._assertReplyQueueOptions);
                    this._replyQueue = assertResult.queue;
                    if (this._bindDirectExchangeName) {
                        yield ch.assertExchange(this._bindDirectExchangeName, 'direct', this._exchangeOptions);
                        yield ch.bindQueue(this._replyQueue, this._bindDirectExchangeName, this._replyQueue);
                    }
                }
                ch.consume(this._replyQueue, (msg) => {
                    return Promise.resolve().then(() => {
                        return this._onReply(msg);
                    }).catch((err) => {
                        this._logger.error('CANNOT CONSUME RPC CLIENT QUEUE', err);
                    });
                }, { noAck: true }).catch((err) => {
                    this._logger.error('CANNOT SET RPC CLIENT QUEUE CONSUMER', err);
                });
                return this._replyQueue;
            }
            catch (err) {
                this._logger.error('CANNOT ASSERT RPC REPLY QUEUE', err);
                throw err;
            }
        });
    }
    /**
     * This method is called when consuming replies
     * @param {Object} reply see: http://www.squaremobius.net/amqp.node/channel_api.html#channel_consume
     * @private
     * */
    _onReply(reply) {
        if (!reply || !reply.properties || !reply.properties.correlationId) {
            this._logger.error('UNKNOWN RPC REPLY FOR %s', this.name, reply);
            return;
        }
        if (!this._correlationIdMap.has(reply.properties.correlationId)) {
            this._logger.warn('UNABLE TO MATCH RPC REPLY WITH MESSAGE SENT ON %s (possibly timed out)', this.name, reply.properties);
            return;
        }
        const { resolve, reject, resolveWithFullResponse } = this._correlationIdMap.get(reply.properties.correlationId);
        this._correlationIdMap.delete(reply.properties.correlationId);
        const replyContent = this.ResponseMessageModel.unserialize(reply.content, this.ResponseContentSchema);
        if (replyContent.status === 'ok') {
            if (resolveWithFullResponse) {
                resolve(replyContent);
            }
            else {
                resolve(replyContent.data);
            }
        }
        else {
            this._logger.error('RPC CLIENT GOT ERROR', this.name, reply.properties.correlationId);
            reject(replyContent.data);
        }
    }
}
exports.default = RPCClient;
