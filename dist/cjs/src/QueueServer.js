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
const Subscriber_js_1 = __importDefault(require("./Subscriber.js"));
class QueueServer extends Subscriber_js_1.default {
    /**
     * @param {QueueConnection} queueConnection
     * @param {Console} logger
     * @param {String} name
     * @param {Object} options
     */
    constructor(queueConnection, logger, name, options = {}) {
        super(queueConnection, logger, name, options);
        const { assertQueue = true, assertQueueOptions = {}, prefetchCount } = options;
        this._assertQueue = null;
        this._prefetchCount = prefetchCount;
        this._assertQueue = assertQueue === true;
        this._assertQueueOptions = Object.assign({ durable: true }, assertQueueOptions);
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
                yield channel.prefetch(this._prefetchCount);
                yield channel.consume(this.name, (msg) => {
                    this._processMessage(channel, msg);
                });
            }
            catch (err) {
                this._logger.error('CANNOT INITIALIZE QUEUE SERVER', this.name, this._assertQueueOptions, err);
                throw err;
            }
        });
    }
}
exports.default = QueueServer;
