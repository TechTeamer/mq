"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Publisher_js_1 = __importDefault(require("./Publisher.js"));
class QueueClient extends Publisher_js_1.default {
    /**
     * @param {QueueConnection} queueConnection
     * @param {Console} logger
     * @param {String} name
     * @param {Object} options
     */
    constructor(queueConnection, logger, name, options = {}) {
        super(queueConnection, logger, '', options);
        this.routingKey = name;
        this._assertQueue = null;
        const { assertQueue = true, assertQueueOptions = {} } = options;
        this._assertQueue = assertQueue === true;
        this._assertQueueOptions = Object.assign({ durable: true }, assertQueueOptions);
    }
    /**
     * @param channel
     * @returns {Promise}
     */
    assertExchangeOrQueue(channel) {
        if (this._assertQueue) {
            return channel.assertQueue(this.routingKey, this._assertQueueOptions);
        }
    }
}
exports.default = QueueClient;
