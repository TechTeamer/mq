export default QueueManager;
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
declare class QueueManager {
    /**
     * @param {QueueConfig} config
     */
    constructor(config: QueueConfig);
    connection: QueueConnection;
    _config: QueueConfig;
    _logger: any;
    /** @var Map<string, RPCClient>} */
    rpcClients: Map<any, any>;
    /** @var Map<string, RPCServer>} */
    rpcServers: Map<any, any>;
    /** @var Map<string, Publisher>} */
    publishers: Map<any, any>;
    /** @var Map<string, Subscriber>} */
    subscribers: Map<any, any>;
    /** @var Map<string, QueueClient>} */
    queueClients: Map<any, any>;
    /** @var Map<string, QueueServer>} */
    queueServers: Map<any, any>;
    /** @var Map<string, GatheringClient>} */
    gatheringClients: Map<any, any>;
    /** @var Map<string, GatheringServer>} */
    gatheringServers: Map<any, any>;
    connect(): Promise<void>;
    reconnect(): Promise<void>;
    setLogger(logger: any): void;
    /**
     * @param {String} rpcName
     * @param {RPCClient|function() : RPCClient} OverrideClass
     * @param {Object} [options]
     * @return RPCClient
     * */
    getRPCClient(rpcName: string, OverrideClass?: RPCClient | (() => RPCClient), options?: Object | undefined, ...args: any[]): any;
    /**
     * @param {String} rpcName
     * @param {RPCServer|function() : RPCServer} OverrideClass
     * @param {Object} [options]
     * @return RPCServer
     */
    getRPCServer(rpcName: string, OverrideClass?: RPCServer | (() => RPCServer), options?: Object | undefined, ...args: any[]): any;
    /**
     * @param {String} exchangeName
     * @param {Publisher|function() : Publisher} OverrideClass
     * @param {Object} [options]
     * @return Publisher
     */
    getPublisher(exchangeName: string, OverrideClass?: Publisher | (() => Publisher), options?: Object | undefined, ...args: any[]): any;
    /**
     * @param {String} exchangeName
     * @param {Subscriber|function() : Subscriber} OverrideClass
     * @param {Object} [options]
     * @return Subscriber
     */
    getSubscriber(exchangeName: string, OverrideClass?: Subscriber | (() => Subscriber), options?: Object | undefined, ...args: any[]): any;
    /**
     * @param {String} exchangeName
     * @param {GatheringClient|function() : GatheringClient} OverrideClass
     * @param {Object} [options]
     * @return GatheringClient
     */
    getGatheringClient(exchangeName: string, OverrideClass?: GatheringClient | (() => GatheringClient), options?: Object | undefined, ...args: any[]): any;
    /**
     * @param {String} exchangeName
     * @param {GatheringServer|function() : GatheringServer} OverrideClass
     * @param {Object} [options]
     * @return GatheringServer
     */
    getGatheringServer(exchangeName: string, OverrideClass?: GatheringServer | (() => GatheringServer), options?: Object | undefined, ...args: any[]): any;
    /**
     * @param {String} queueName
     * @param {QueueClient|function() : QueueClient} OverrideClass
     * @param {Object} [options={}]
     * @return QueueClient
     */
    getQueueClient(queueName: string, OverrideClass?: QueueClient | (() => QueueClient), options?: Object | undefined, ...args: any[]): any;
    /**
     * @param {String} queueName
     * @param {QueueServer|function() : QueueServer} OverrideClass
     * @param {Object} [options]
     * @return QueueServer
     */
    getQueueServer(queueName: string, OverrideClass?: QueueServer | (() => QueueServer), options?: Object | undefined, ...args: any[]): any;
    _isSubClass(TestClass: any, ParentClass: any): boolean;
}
import QueueConnection from './QueueConnection.js';
import QueueConfig from './QueueConfig.js';
import RPCClient from './RPCClient.js';
import RPCServer from './RPCServer.js';
import Publisher from './Publisher.js';
import Subscriber from './Subscriber.js';
import GatheringClient from './GatheringClient.js';
import GatheringServer from './GatheringServer.js';
import QueueClient from './QueueClient.js';
import QueueServer from './QueueServer.js';
