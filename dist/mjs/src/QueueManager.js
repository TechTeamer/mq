import QueueConfig from './QueueConfig.js';
import QueueConnection from './QueueConnection.js';
import RPCClient from './RPCClient.js';
import RPCServer from './RPCServer.js';
import Publisher from './Publisher.js';
import Subscriber from './Subscriber.js';
import QueueClient from './QueueClient.js';
import QueueServer from './QueueServer.js';
import GatheringClient from './GatheringClient.js';
import GatheringServer from './GatheringServer.js';
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
        this.connection = new QueueConnection(config);
        this._config = new QueueConfig(config);
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
    async connect() {
        try {
            await this.connection.connect();
        }
        catch (err) {
            this._logger.error('Failed to connect to queue server', err);
            throw err;
        }
        try {
            for (const [, rpcServer] of this.rpcServers) {
                await rpcServer.initialize();
            }
            for (const [, rpcClient] of this.rpcClients) {
                await rpcClient.initialize();
            }
            for (const [, publisher] of this.publishers) {
                await publisher.initialize();
            }
            for (const [, subscriber] of this.subscribers) {
                await subscriber.initialize();
            }
            for (const [, queueServer] of this.queueServers) {
                await queueServer.initialize();
            }
            for (const [, queueClient] of this.queueClients) {
                await queueClient.initialize();
            }
            for (const [, gatheringClient] of this.gatheringClients) {
                await gatheringClient.initialize();
            }
            for (const [, gatheringServer] of this.gatheringServers) {
                await gatheringServer.initialize();
            }
        }
        catch (err) {
            this._logger.error('Failed to initialize servers', err);
            throw err;
        }
    }
    async reconnect() {
        try {
            await this.connection.close();
            await this.connect();
        }
        catch (err) {
            this._logger.error('Failed to reconnect to queue server', err);
            throw err;
        }
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
    getRPCClient(rpcName, OverrideClass = RPCClient, options = {}) {
        if (this.rpcClients.has(rpcName)) {
            return this.rpcClients.get(rpcName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = RPCClient;
        }
        if (!this._isSubClass(OverrideClass, RPCClient)) {
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
    getRPCServer(rpcName, OverrideClass = RPCServer, options = {}) {
        if (this.rpcServers.has(rpcName)) {
            return this.rpcServers.get(rpcName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = RPCServer;
        }
        if (!this._isSubClass(OverrideClass, RPCServer)) {
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
    getPublisher(exchangeName, OverrideClass = Publisher, options = {}) {
        if (this.publishers.has(exchangeName)) {
            return this.publishers.get(exchangeName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = Publisher;
        }
        if (!this._isSubClass(OverrideClass, Publisher)) {
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
    getSubscriber(exchangeName, OverrideClass = Subscriber, options = {}) {
        if (this.subscribers.has(exchangeName)) {
            return this.subscribers.get(exchangeName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = Subscriber;
        }
        if (!this._isSubClass(OverrideClass, Subscriber)) {
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
    getGatheringClient(exchangeName, OverrideClass = GatheringClient, options = {}) {
        if (this.gatheringClients.has(exchangeName)) {
            return this.gatheringClients.get(exchangeName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = GatheringClient;
        }
        if (!this._isSubClass(OverrideClass, GatheringClient)) {
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
    getGatheringServer(exchangeName, OverrideClass = GatheringServer, options = {}) {
        if (this.gatheringServers.has(exchangeName)) {
            return this.gatheringServers.get(exchangeName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = GatheringServer;
        }
        if (!this._isSubClass(OverrideClass, GatheringServer)) {
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
    getQueueClient(queueName, OverrideClass = QueueClient, options = {}) {
        if (this.queueClients.has(queueName)) {
            return this.queueClients.get(queueName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = QueueClient;
        }
        if (!this._isSubClass(OverrideClass, QueueClient)) {
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
    getQueueServer(queueName, OverrideClass = QueueServer, options = {}) {
        if (this.queueServers.has(queueName)) {
            return this.queueServers.get(queueName);
        }
        if (arguments.length === 2 && typeof OverrideClass !== 'function') {
            options = OverrideClass;
            OverrideClass = QueueServer;
        }
        if (!this._isSubClass(OverrideClass, QueueServer)) {
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
export default QueueManager;
