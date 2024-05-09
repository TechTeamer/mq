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
const QueueMessage_js_1 = __importDefault(require("./QueueMessage.js"));
const QueueResponse_js_1 = __importDefault(require("./QueueResponse.js"));
/**
 * @class RPCServer
 * */
class RPCServer {
    /**
     * @param {QueueConnection} queueConnection
     * @param {Console} logger
     * @param {String} rpcName
     * @param {Object} options
     */
    constructor(queueConnection, logger, rpcName, options = {}) {
        const { prefetchCount, timeoutMs, RequestMessageModel = QueueMessage_js_1.default, ResponseMessageModel = QueueMessage_js_1.default, RequestContentSchema = JSON, ResponseContentSchema = JSON, assertQueue = true, assertQueueOptions = {}, bindDirectExchangeName = null, exchangeOptions = {} } = options;
        this._connection = queueConnection;
        this._logger = logger;
        this.name = rpcName;
        this._assertQueue = assertQueue === true;
        this._assertQueueOptions = Object.assign({ durable: true }, assertQueueOptions);
        this._bindDirectExchangeName = bindDirectExchangeName;
        this._exchangeOptions = exchangeOptions;
        this._prefetchCount = prefetchCount;
        this._timeoutMs = timeoutMs;
        this.RequestModel = RequestMessageModel;
        this.ResponseModel = ResponseMessageModel;
        this.RequestContentSchema = RequestContentSchema;
        this.ResponseContentSchema = ResponseContentSchema;
        this.actions = new Map();
    }
    /**
     * @param {*} body
     * @param {QueueMessage} request
     * @param {QueueResponse} response
     * @param {Object} msg
     * @protected
     * @returns {Promise}
     */
    _callback(body, request, response, msg) {
        const { action, data } = body || {};
        if (!this.actions.has(action)) {
            return Promise.resolve();
        }
        const handler = this.actions.get(action);
        return Promise.resolve().then(() => handler.call(this, data, request, response, msg));
    }
    /**
     * @param {string} action
     * @param {Function} handler
     */
    registerAction(action, handler) {
        if (typeof handler !== 'function') {
            throw new TypeError(`${typeof handler} is not a Function`);
        }
        if (this.actions.has(action)) {
            this._logger.warn(`Actions-handlers map already contains an action named ${action}. New handler was ignored!`);
            return;
        }
        this.actions.set(action, handler);
    }
    /**
     * @return {Promise}
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const channel = yield this._connection.getChannel();
                if (this._assertQueue) {
                    yield channel.assertQueue(this.name, this._assertQueueOptions);
                }
                if (this._bindDirectExchangeName) {
                    yield channel.assertExchange(this._bindDirectExchangeName, 'direct', this._exchangeOptions);
                }
                yield channel.prefetch(this._prefetchCount);
                yield channel.consume(this.name, (msg) => {
                    this._processMessage(channel, msg);
                });
            }
            catch (err) {
                this._logger.error('CANNOT CREATE RPC SERVER CHANNEL', err);
                throw err;
            }
        });
    }
    /**
     * @param ch
     * @param msg
     * @private
     */
    _ack(ch, msg) {
        if (msg.acked) {
            this._logger.error('trying to double ack', msg.properties);
            return;
        }
        ch.ack(msg);
        msg.acked = true;
    }
    _createResponseTimeoutReply(_msg, _request) {
        return new this.ResponseModel('error', 'timeout', null, this.ResponseContentSchema);
    }
    onResponseTimeout(ch, msg, request) {
        this._send(ch, msg.properties.replyTo, this._createResponseTimeoutReply(msg, request).serialize(), { correlationId: msg.properties.correlationId });
        this._ack(ch, msg);
    }
    handleResponseTimeout(ch, msg, request) {
        try {
            this.onResponseTimeout(ch, msg, request);
        }
        catch (err) {
            this._logger.error('Error handling RPC response timeout', err);
            this._ack(ch, msg);
        }
    }
    _createRequestErrorReply(_msg, _request) {
        return new this.ResponseModel('error', 'cannot decode parameters', null, this.ResponseContentSchema);
    }
    onRequestError(ch, msg, request) {
        this._send(ch, msg.properties.replyTo, this._createRequestErrorReply(msg, request).serialize(), { correlationId: msg.properties.correlationId });
        this._ack(ch, msg);
    }
    handleRequestError(ch, msg, request) {
        try {
            this.onRequestError(ch, msg, request);
        }
        catch (err) {
            this._logger.error('Error handling RPC request error', err);
            this._ack(ch, msg);
        }
    }
    _createResponseErrorReply(_msg, _error, _request) {
        return new this.ResponseModel('error', 'cannot answer', null, this.ResponseContentSchema);
    }
    onResponseError(ch, msg, error, request) {
        this._send(ch, msg.properties.replyTo, this._createResponseErrorReply(msg, error, request).serialize(), { correlationId: msg.properties.correlationId });
        this._ack(ch, msg);
    }
    handleResponseError(ch, msg, error, request) {
        try {
            this.onResponseError(ch, msg, error, request);
        }
        catch (err) {
            this._logger.error('Error handling RPC response error', err);
            this._ack(ch, msg);
        }
    }
    _createReply(_msg, answer) {
        return new this.ResponseModel('ok', answer, null, this.ResponseContentSchema);
    }
    /**
     * @param ch
     * @param msg
     * @return {Promise}
     * @private
     */
    _processMessage(ch, msg) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = this.RequestModel.unserialize(msg.content, this.RequestContentSchema);
            const response = new QueueResponse_js_1.default();
            if (request.status !== 'ok') {
                this._logger.error('CANNOT GET RPC CALL PARAMS', this.name, request);
                this.handleRequestError(ch, msg, request);
                return;
            }
            let timedOut = false;
            const timeoutMs = typeof request.timeOut === 'number' ? request.timeOut : this._timeoutMs;
            const timer = setTimeout(() => {
                timedOut = true;
                this._logger.error('RPCServer response timeout', this.name);
                this.handleResponseTimeout(ch, msg, request);
            }, timeoutMs);
            try {
                const answer = yield this._callback(request.data, request, response, msg);
                if (timedOut) {
                    return;
                }
                clearTimeout(timer);
                let replyData;
                const replyAttachments = response.getAttachments();
                try {
                    const reply = this._createReply(msg, answer);
                    for (const [key, value] of replyAttachments) {
                        reply.addAttachment(key, value);
                    }
                    replyData = reply.serialize();
                }
                catch (err) {
                    this._logger.error('CANNOT CREATE RPC REPLY', this.name, err);
                    this.handleResponseError(ch, msg, err, request);
                    return;
                }
                this._send(ch, msg.properties.replyTo, replyData, { correlationId: msg.properties.correlationId });
                this._ack(ch, msg);
            }
            catch (err) {
                if (timedOut) {
                    return;
                }
                clearTimeout(timer);
                this._logger.error('CANNOT SEND RPC REPLY', this.name, err);
                this.handleResponseError(ch, msg, err, request);
            }
        });
    }
    _send(channel, replyTo, data, options) {
        if (this._bindDirectExchangeName) {
            channel.publish(this._bindDirectExchangeName, replyTo, data, options);
        }
        else {
            channel.sendToQueue(replyTo, data, options);
        }
    }
    /**
     * @param {Function} cb
     */
    consume(cb) {
        this._callback = cb;
    }
}
exports.default = RPCServer;
