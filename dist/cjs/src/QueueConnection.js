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
const node_fs_1 = require("node:fs");
const channel_api_js_1 = require("amqplib/channel_api.js");
const QueueConfig_js_1 = __importDefault(require("./QueueConfig.js"));
const node_events_1 = __importDefault(require("node:events"));
/**
 * @class QueueConnection
 * */
class QueueConnection extends node_events_1.default {
    /**
     * @param {Object|QueueConfig} config
     */
    constructor(config) {
        super();
        this._config = new QueueConfig_js_1.default(config);
        this._logger = this._config.logger;
        this._connection = null;
        this._connectionPromise = null;
        this._channel = null;
        this._channelPromise = null;
        this._activeConnectionConfig = null;
    }
    setLogger(logger) {
        this._logger = logger;
    }
    /**
     * @return Promise<amqplib.Connection>
     * */
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._connection) {
                return this._connection;
            }
            if (this._connectionPromise) {
                return this._connectionPromise;
            }
            const options = Object.assign({}, this._config.options);
            if (options.cert) {
                options.cert = (0, node_fs_1.readFileSync)(options.cert);
            }
            if (options.key) {
                options.key = (0, node_fs_1.readFileSync)(options.key);
            }
            if (options.ca) {
                options.ca = options.ca.map((ca) => (0, node_fs_1.readFileSync)(ca));
            }
            this._connectionPromise = this._connect(this._config.url, options).then((connection) => {
                this._logger.info(`RabbitMQ connection established: '${QueueConfig_js_1.default.urlObjectToLogString(this._activeConnectionConfig)}'`);
                this.emitConnectionEvents(connection);
                this._connection = connection;
                return connection;
            }).catch((err) => {
                this._logger.error('RabbitMQ connection failed', err);
                this._connectionPromise = null;
                throw err;
            });
            return this._connectionPromise;
        });
    }
    emitConnectionEvents(connection) {
        connection.on('error', (err) => {
            if (err.message !== 'Connection closing') {
                this._logger.error('RabbitMQ error', err);
                if (this.listenerCount('error') > 0) {
                    // NOTE: https://nodejs.org/docs/latest-v18.x/api/errors.html#error-propagation-and-interception
                    // 'error' named events must have a subscriber in order to avoid uncaughtException errors.
                    // We use this listenerCount condition to avoid emitting errors if there are no listeners.
                    this.emit('error', err);
                }
            }
        });
        connection.on('close', (err) => {
            this._logger.error('RabbitMQ closed', err);
            this.emit('close', err);
        });
        connection.on('blocked', (reason) => {
            this._logger.error('RabbitMQ blocked', reason);
            this.emit('blocked', reason);
        });
        connection.on('unblocked', (reason) => {
            this._logger.error('RabbitMQ unblocked', reason);
            this.emit('unblocked', reason);
        });
    }
    _connect(configUrl, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // handle multiple connection hosts
            if (Array.isArray(configUrl.hostname)) {
                const urls = [];
                for (const host of configUrl.hostname) {
                    urls.push(Object.assign(Object.assign({}, configUrl), { hostname: host // use hostname from current iteration
                     }));
                }
                configUrl = urls;
            }
            // handle multiple connection urls
            if (Array.isArray(configUrl)) {
                return this._connectWithMultipleUrls(configUrl, options);
            }
            // assume simple url string or standard url object
            const connectionUrl = QueueConfig_js_1.default.urlStringToObject(configUrl);
            const connection = yield (0, channel_api_js_1.connect)(configUrl, options);
            this._activeConnectionConfig = connectionUrl;
            return connection;
        });
    }
    _connectWithMultipleUrls(urls, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._config.shuffleUrls) {
                urls = this.shuffleUrls(urls);
            }
            for (const url of urls) {
                const connectionUrl = QueueConfig_js_1.default.urlStringToObject(url);
                try {
                    const connection = yield (0, channel_api_js_1.connect)(connectionUrl, options);
                    this._activeConnectionConfig = connectionUrl;
                    return connection;
                }
                catch (err) {
                    this._logger.warn('RabbitMQ connection failed to host:', Object.assign(Object.assign({}, connectionUrl), { password: connectionUrl.password ? '***' : connectionUrl.password }));
                }
            }
            throw new Error('RabbitMQ connection failed with multiple urls');
        });
    }
    shuffleUrls(urls) {
        // shuffle urls - try to connect to nodes in a random order
        return [...urls].sort((a, b) => 0.5 - Math.random());
    }
    /**
     * @return Promise
     * */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._connection) {
                try {
                    yield this._connection.close();
                }
                catch (err) {
                    this._logger.error('RabbitMQ close connection failed', err);
                    if (!err.message.startsWith('Connection closed')) {
                        throw err;
                    }
                }
            }
            this._connection = null;
            this._connectionPromise = null;
        });
    }
    /**
     * @return Promise<amqplib.ConfirmChannel>
     * */
    getChannel() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._channel) {
                return this._channel;
            }
            if (this._channelPromise) {
                return this._channelPromise;
            }
            this._channelPromise = this.connect().then((connection) => {
                return connection.createConfirmChannel();
            }).then((channel) => {
                this.emitChannelEvents(channel);
                this._channel = channel;
                return channel;
            }).catch((err) => {
                this._logger.error(err);
                throw err;
            });
            return this._channelPromise;
        });
    }
    emitChannelEvents(channel) {
        channel.on('error', (err) => {
            this._logger.error('RabbitMQ channel error', err);
            if (this.listenerCount('error') > 0) {
                // NOTE: https://nodejs.org/docs/latest-v18.x/api/errors.html#error-propagation-and-interception
                // 'error' named events must have a subscriber in order to avoid uncaughtException errors.
                // We use this listenerCount condition to avoid emitting errors if there are no listeners.
                this.emit('error', err);
            }
        });
        channel.on('close', (err) => {
            this._logger.error('RabbitMQ channel closed', err);
            this.emit('close', err);
        });
        channel.on('return', (reason) => {
            this.emit('return', reason);
        });
        channel.on('drain', (reason) => {
            this.emit('drain', reason);
        });
    }
}
exports.default = QueueConnection;
