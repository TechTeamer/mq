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
const QueueConfig_js_1 = __importDefault(require("./QueueConfig.js"));
const QueueConnection_js_1 = __importDefault(require("./QueueConnection.js"));
const RPCClient_js_1 = __importDefault(require("./RPCClient.js"));
const RPCServer_js_1 = __importDefault(require("./RPCServer.js"));
const Publisher_js_1 = __importDefault(require("./Publisher.js"));
const Subscriber_js_1 = __importDefault(require("./Subscriber.js"));
const QueueClient_js_1 = __importDefault(require("./QueueClient.js"));
const QueueServer_js_1 = __importDefault(require("./QueueServer.js"));
const GatheringClient_js_1 = __importDefault(require("./GatheringClient.js"));
const GatheringServer_js_1 = __importDefault(require("./GatheringServer.js"));
/**
 * @class QueueManager
 * @param {QueueConnection} connection
 * @property {Map<String, RPCClient>} rpcClients
 * @property {Map<String, RPCServer>} rpcServers
 * @property {Map<String, Publisher>} publishers
 * @property {Map<String, Subscriber>} subscribers
 * @property {Map<String, QueueClient>} queueClients
 * @property {Map<String, QueueServer>} queueServers
 * @property {Map<String, GatheringClient>} gatheringClients
 * @property {Map<String, GatheringServer>} gatheringServers
 * */
class QueueManager {
    /**
     * @param {QueueConfig} config
     */
    constructor(config) {
        this.connection = new QueueConnection_js_1.default(config);
        this._config = new QueueConfig_js_1.default(config);
        this._logger = this._config.logger;
        /** @var Map<string, RPCClient>} */
        this.rpcClients = new Map();
        /** @var Map<string, RPCServer>} */
        this.rpcServers = new Map();
        /** @var Map<string, Publisher>} */
        this.publishers = new Map();
        /** @var Map<string, Subscriber>} */
        this.subscribers = new Map();
        /** @var Map<string, QueueClient>} */
        this.queueClients = new Map();
        /** @var Map<string, QueueServer>} */
        this.queueServers = new Map();
        /** @var Map<string, GatheringClient>} */
        this.gatheringClients = new Map();
        /** @var Map<string, GatheringServer>} */
        this.gatheringServers = new Map();
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.connection.connect();
            }
            catch (err) {
                this._logger.error('Failed to connect to queue server', err);
                throw err;
            }
            try {
                for (const [, rpcServer] of this.rpcServers) {
                    yield rpcServer.initialize();
                }
                for (const [, rpcClient] of this.rpcClients) {
                    yield rpcClient.initialize();
                }
                for (const [, publisher] of this.publishers) {
                    yield publisher.initialize();
                }
                for (const [, subscriber] of this.subscribers) {
                    yield subscriber.initialize();
                }
                for (const [, queueServer] of this.queueServers) {
                    yield queueServer.initialize();
                }
                for (const [, queueClient] of this.queueClients) {
                    yield queueClient.initialize();
                }
                for (const [, gatheringClient] of this.gatheringClients) {
                    yield gatheringClient.initialize();
                }
                for (const [, gatheringServer] of this.gatheringServers) {
                    yield gatheringServer.initialize();
                }
            }
            catch (err) {
                this._logger.error('Failed to initialize servers', err);
                throw err;
            }
        });
    }
    reconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.connection.close();
                yield this.connect();
            }
            catch (err) {
                this._logger.error('Failed to reconnect to queue server', err);
                throw err;
            }
        });
    }
    setLogger(logger) {
        this._logger = logger;
        this.connection.setLogger(logger);
    }
    /**
     * @param {String} rpcName
     * @param {RPCClient|function() : RPCClient} OverrideClass
     * @param {Object} [options]
     * @return RPCClient
     * */
    getRPCClient(rpcName, OverrideClass = RPCClient_js_1.default, options = {}) {
        if (this.rpcClients.has(rpcName)) {
            return this.rpcClients.get(rpcName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = RPCClient_js_1.default;
        }
        if (!this._isSubClass(OverrideClass, RPCClient_js_1.default)) {
            throw new Error('Override must be a subclass of RPCClient');
        }
        const settings = Object.assign({
            queueMaxSize: this._config.rpcQueueMaxSize,
            timeoutMs: this._config.rpcTimeoutMs,
            assertReplyQueueOptions: this._config.rpcClientAssertReplyQueueOptions,
            exchangeOptions: this._config.rpcClientExchangeOptions
        }, options);
        const rpcClient = new OverrideClass(this.connection, this._logger, rpcName, settings);
        this.rpcClients.set(rpcName, rpcClient);
        return rpcClient;
    }
    /**
     * @param {String} rpcName
     * @param {RPCServer|function() : RPCServer} OverrideClass
     * @param {Object} [options]
     * @return RPCServer
     */
    getRPCServer(rpcName, OverrideClass = RPCServer_js_1.default, options = {}) {
        if (this.rpcServers.has(rpcName)) {
            return this.rpcServers.get(rpcName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = RPCServer_js_1.default;
        }
        if (!this._isSubClass(OverrideClass, RPCServer_js_1.default)) {
            throw new Error('Override must be a subclass of RPCServer');
        }
        const settings = Object.assign({
            prefetchCount: 1,
            timeoutMs: this._config.rpcTimeoutMs,
            assertQueueOptions: this._config.rpcServerAssertQueueOptions,
            exchangeOptions: this._config.rpcServerExchangeOptions
        }, options);
        const rpcServer = new OverrideClass(this.connection, this._logger, rpcName, settings);
        this.rpcServers.set(rpcName, rpcServer);
        return rpcServer;
    }
    /**
     * @param {String} exchangeName
     * @param {Publisher|function() : Publisher} OverrideClass
     * @param {Object} [options]
     * @return Publisher
     */
    getPublisher(exchangeName, OverrideClass = Publisher_js_1.default, options = {}) {
        if (this.publishers.has(exchangeName)) {
            return this.publishers.get(exchangeName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = Publisher_js_1.default;
        }
        if (!this._isSubClass(OverrideClass, Publisher_js_1.default)) {
            throw new Error('Override must be a subclass of Publisher');
        }
        const settings = Object.assign({
            assertExchangeOptions: this._config.publisherAssertExchangeOptions
        }, options);
        const publisher = new OverrideClass(this.connection, this._logger, exchangeName, settings);
        this.publishers.set(exchangeName, publisher);
        return publisher;
    }
    /**
     * @param {String} exchangeName
     * @param {Subscriber|function() : Subscriber} OverrideClass
     * @param {Object} [options]
     * @return Subscriber
     */
    getSubscriber(exchangeName, OverrideClass = Subscriber_js_1.default, options = {}) {
        if (this.subscribers.has(exchangeName)) {
            return this.subscribers.get(exchangeName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = Subscriber_js_1.default;
        }
        if (!this._isSubClass(OverrideClass, Subscriber_js_1.default)) {
            throw new Error('Override must be a subclass of Subscriber');
        }
        const settings = Object.assign({
            prefetchCount: 1,
            maxRetry: 5,
            timeoutMs: this._config.rpcTimeoutMs,
            assertQueueOptions: this._config.subscriberAssertQueueOptions,
            assertExchangeOptions: this._config.subscriberAssertExchangeOptions
        }, options);
        const subscriber = new OverrideClass(this.connection, this._logger, exchangeName, settings);
        this.subscribers.set(exchangeName, subscriber);
        return subscriber;
    }
    /**
     * @param {String} exchangeName
     * @param {GatheringClient|function() : GatheringClient} OverrideClass
     * @param {Object} [options]
     * @return GatheringClient
     */
    getGatheringClient(exchangeName, OverrideClass = GatheringClient_js_1.default, options = {}) {
        if (this.gatheringClients.has(exchangeName)) {
            return this.gatheringClients.get(exchangeName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = GatheringClient_js_1.default;
        }
        if (!this._isSubClass(OverrideClass, GatheringClient_js_1.default)) {
            throw new Error('Override must be a subclass of GatheringClient');
        }
        const settings = Object.assign({
            assertQueueOptions: this._config.gatheringClientAssertQueueOptions,
            assertExchangeOptions: this._config.gatheringClientAssertExchangeOptions
        }, options);
        const gatheringClient = new OverrideClass(this.connection, this._logger, exchangeName, settings);
        this.gatheringClients.set(exchangeName, gatheringClient);
        return gatheringClient;
    }
    /**
     * @param {String} exchangeName
     * @param {GatheringServer|function() : GatheringServer} OverrideClass
     * @param {Object} [options]
     * @return GatheringServer
     */
    getGatheringServer(exchangeName, OverrideClass = GatheringServer_js_1.default, options = {}) {
        if (this.gatheringServers.has(exchangeName)) {
            return this.gatheringServers.get(exchangeName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = GatheringServer_js_1.default;
        }
        if (!this._isSubClass(OverrideClass, GatheringServer_js_1.default)) {
            throw new Error('Override must be a subclass of GatheringServer');
        }
        const settings = Object.assign({
            timeoutMs: this._config.rpcTimeoutMs,
            assertQueueOptions: this._config.gatheringServerAssertQueueOptions,
            assertExchangeOptions: this._config.gatheringServerAssertExchangeOptions
        }, options);
        const gatheringServer = new OverrideClass(this.connection, this._logger, exchangeName, settings);
        this.gatheringServers.set(exchangeName, gatheringServer);
        return gatheringServer;
    }
    /**
     * @param {String} queueName
     * @param {QueueClient|function() : QueueClient} OverrideClass
     * @param {Object} [options={}]
     * @return QueueClient
     */
    getQueueClient(queueName, OverrideClass = QueueClient_js_1.default, options = {}) {
        if (this.queueClients.has(queueName)) {
            return this.queueClients.get(queueName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = QueueClient_js_1.default;
        }
        if (!this._isSubClass(OverrideClass, QueueClient_js_1.default)) {
            throw new Error('Override must be a subclass of QueueClient');
        }
        const settings = Object.assign({
            assertQueueOptions: this._config.queueClientAssertQueueOptions
        }, options);
        const queueClient = new OverrideClass(this.connection, this._logger, queueName, settings);
        this.queueClients.set(queueName, queueClient);
        return queueClient;
    }
    /**
     * @param {String} queueName
     * @param {QueueServer|function() : QueueServer} OverrideClass
     * @param {Object} [options]
     * @return QueueServer
     */
    getQueueServer(queueName, OverrideClass = QueueServer_js_1.default, options = {}) {
        if (this.queueServers.has(queueName)) {
            return this.queueServers.get(queueName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = QueueServer_js_1.default;
        }
        if (!this._isSubClass(OverrideClass, QueueServer_js_1.default)) {
            throw new Error('Override must be a subclass of QueueServer');
        }
        const settings = Object.assign({
            prefetchCount: 1,
            maxRetry: 5,
            timeoutMs: this._config.rpcTimeoutMs,
            assertQueueOptions: this._config.queueServerAssertQueueOptions
        }, options);
        const queueServer = new OverrideClass(this.connection, this._logger, queueName, settings);
        this.queueServers.set(queueName, queueServer);
        return queueServer;
    }
    _isSubClass(TestClass, ParentClass) {
        return TestClass === ParentClass || TestClass.prototype instanceof ParentClass;
    }
}
exports.default = QueueManager;
