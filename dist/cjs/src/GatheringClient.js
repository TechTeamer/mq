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
class GatheringClient {
    /**
     * @param {QueueConnection} queueConnection
     * @param {Console} logger
     * @param {String} name
     * @param {Object} [options]
     */
    constructor(queueConnection, logger, name, options = {}) {
        this._connection = queueConnection;
        this._logger = logger;
        this.name = name;
        this.statusQueue = name;
        this._correlationIdMap = new Map();
        this._replyQueue = '';
        const { queueMaxSize, timeoutMs, serverCount = 0, assertQueueOptions = {}, assertExchange = true, assertExchangeOptions = {} } = options;
        this._rpcQueueMaxSize = queueMaxSize;
        this._rpcTimeoutMs = timeoutMs;
        this._gatheringServerCount = serverCount;
        this._assertExchange = assertExchange === true;
        this._assertQueueOptions = Object.assign({ exclusive: true, autoDelete: true }, assertQueueOptions);
        this._assertExchangeOptions = Object.assign({ durable: true }, assertExchangeOptions);
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const channel = yield this._connection.getChannel();
                if (this._assertExchange) {
                    yield channel.assertExchange(this.name, 'fanout', this._assertExchangeOptions);
                }
                const replyQueue = yield channel.assertQueue('', this._assertQueueOptions);
                this._replyQueue = replyQueue.queue;
                yield channel.consume(this._replyQueue, (reply) => {
                    if (!this.isValidReply(reply)) {
                        return;
                    }
                    const correlationId = reply.properties.correlationId;
                    try {
                        if (reply.properties.type === 'status') {
                            this._handleStatusResponse(reply);
                        }
                        else if (reply.properties.type === 'reply') {
                            this._handleGatheringResponse(reply);
                        }
                        else {
                            this._logger.error(`QUEUE GATHERING CLIENT: INVALID REPLY ON '${this.name}': UNKNOWN MESSAGE TYPE ON REPLY`, correlationId, reply.properties);
                        }
                    }
                    catch (err) {
                        this._logger.error(`QUEUE GATHERING CLIENT: FAILED TO HANDLE MESSAGE ON '${this.name}'`, correlationId, err);
                    }
                }, { noAck: true });
            }
            catch (err) {
                this._logger.error(`QUEUE GATHERING CLIENT: Error initializing '${this.name}'`);
                throw new Error('Error initializing Gathering Client');
            }
        });
    }
    isValidReply(reply) {
        if (!reply) {
            this._logger.error(`QUEUE GATHERING CLIENT: INVALID REPLY ON '${this.name}': NO REPLY`);
            return false;
        }
        if (!reply.properties) {
            this._logger.error(`QUEUE GATHERING CLIENT: INVALID REPLY ON '${this.name}': NO PROPERTIES ON REPLY`);
            return false;
        }
        if (!reply.properties.correlationId) {
            this._logger.error(`QUEUE GATHERING CLIENT: INVALID REPLY ON '${this.name}': NO CORRELATION ID ON REPLY`, reply.properties);
            return false;
        }
        if (!reply.properties.type) {
            this._logger.error(`QUEUE GATHERING CLIENT: INVALID REPLY ON '${this.name}': NO MESSAGE TYPE ON REPLY`, reply.properties);
            return false;
        }
        return true;
    }
    /**
     * @param {*} data
     * @param {Number} timeoutMs
     * @param {Map} attachments
     * @param {Boolean} [resolveWithFullResponse=false]
     * @param {Boolean} [acceptNotFound=true]
     * @return {Promise<QueueMessage|*>}
     * */
    request(data_1) {
        return __awaiter(this, arguments, void 0, function* (data, timeoutMs = null, attachments = null, resolveWithFullResponse = false, acceptNotFound = true) {
            if (this._correlationIdMap.size > this._rpcQueueMaxSize) {
                throw new Error(`QUEUE GATHERING CLIENT: REQUEST LIMIT REACHED '${this.name}'`);
            }
            const channel = yield this._connection.getChannel();
            const statusQueue = yield channel.assertQueue(this.statusQueue, {
                exclusive: false,
                autoDelete: true
            });
            const serverCount = statusQueue.consumerCount;
            const queueMessage = new QueueMessage_js_1.default('ok', data, timeoutMs);
            if (attachments instanceof Map) {
                for (const [key, value] of attachments) {
                    queueMessage.addAttachment(key, value);
                }
            }
            return new Promise((resolve, reject) => {
                let correlationId;
                try {
                    const messageBody = queueMessage.serialize();
                    correlationId = this._registerMessage(resolve, reject, timeoutMs, resolveWithFullResponse, acceptNotFound, serverCount);
                    const messageOptions = {
                        correlationId,
                        replyTo: this._replyQueue
                    };
                    const isWriteBufferEmpty = channel.publish(this.name, '', messageBody, messageOptions, (err) => {
                        if (err) {
                            if (this._correlationIdMap.has(correlationId)) {
                                this._correlationIdMap.delete(correlationId);
                            }
                            this._logger.error('QUEUE GATHERING CLIENT: failed to publish message', err);
                            reject(new Error('channel.publish failed'));
                        }
                    });
                    if (!isWriteBufferEmpty) { // http://www.squaremobius.net/amqp.node/channel_api.html#channel_publish
                        channel.on('drain', () => {
                            resolve();
                        });
                    }
                }
                catch (err) {
                    if (correlationId && this._correlationIdMap.has(correlationId)) {
                        this._correlationIdMap.delete(correlationId);
                    }
                    this._logger.error('QUEUE GATHERING CLIENT: failed to send message', err);
                    reject(err);
                }
            });
        });
    }
    requestAction(action_1, data_1) {
        return __awaiter(this, arguments, void 0, function* (action, data, timeoutMs = null, attachments = null, resolveWithFullResponse = false, acceptNotFound = true) {
            return this.request({ action, data }, timeoutMs, attachments, resolveWithFullResponse, acceptNotFound);
        });
    }
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
    _registerMessage(resolve, reject, timeoutMs, resolveWithFullResponse, acceptNotFound, serverCount) {
        let correlationId;
        let timeoutId;
        let timedOut = false;
        do {
            correlationId = (0, uuid_1.v4)();
        } while (this._correlationIdMap.has(correlationId));
        const requestData = {
            resolveWithFullResponse,
            acceptNotFound,
            serverCount: serverCount || this._gatheringServerCount,
            responseCount: 0,
            timeoutId: null,
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
        };
        this._correlationIdMap.set(correlationId, requestData);
        resolve.timeoutId = timeoutId = setTimeout(() => {
            timedOut = true;
            if (this._correlationIdMap.has(correlationId)) {
                const { serverCount, responseCount } = this._correlationIdMap.get(correlationId) || {}; // eslint-disable-line no-shadow
                this._correlationIdMap.delete(correlationId);
                reject(new Error(`QUEUE GATHERING RESPONSE TIMED OUT '${this.name}' ${correlationId} ${responseCount}/${serverCount}`));
            }
        }, timeoutMs || this._rpcTimeoutMs);
        return correlationId;
    }
    _handleGatheringResponse(reply) {
        const correlationId = reply.properties.correlationId;
        if (!this._correlationIdMap.has(correlationId)) {
            this._logger.warn(`QUEUE GATHERING CLIENT: RECEIVED UNKNOWN REPLY (possibly timed out or already received) '${this.name}'`, correlationId);
            return;
        }
        const requestData = this._correlationIdMap.get(correlationId);
        const { resolve, reject, resolveWithFullResponse } = requestData || {};
        this._correlationIdMap.delete(correlationId);
        const replyContent = QueueMessage_js_1.default.unserialize(reply.content);
        if (replyContent.status === 'ok') {
            if (resolveWithFullResponse) {
                resolve(replyContent);
            }
            else {
                resolve(replyContent.data);
            }
        }
        else {
            this._logger.error('QUEUE GATHERING CLIENT: RECEIVED ERROR REPLY', this.name, correlationId);
            reject(new Error(replyContent.data));
        }
    }
    _handleStatusResponse(reply) {
        const correlationId = reply.properties.correlationId;
        if (!this._correlationIdMap.has(correlationId)) {
            return;
        }
        const requestData = this._correlationIdMap.get(correlationId);
        const { resolve, reject, acceptNotFound, serverCount, responseCount } = requestData || {};
        const replyMessage = QueueMessage_js_1.default.unserialize(reply.content);
        if (replyMessage.status === 'error') {
            this._logger.error(`QUEUE GATHERING CLIENT: RECEIVED ERROR STATUS ON '${this.name}'`, correlationId);
            this._correlationIdMap.delete(correlationId);
            reject(new Error(replyMessage.data));
            return;
        }
        requestData.responseCount++;
        if (requestData.responseCount >= serverCount) {
            this._correlationIdMap.delete(correlationId);
            if (acceptNotFound) {
                resolve();
            }
            else {
                reject(new Error(`Gathering failed: resource not found ${responseCount}/${serverCount}`));
            }
        }
    }
}
exports.default = GatheringClient;
