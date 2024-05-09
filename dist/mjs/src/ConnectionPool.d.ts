export default ConnectionPool;
/**
 * @class ConnectionPool
 * */
declare class ConnectionPool {
    /**
     * @param {Object} poolConfig
     * @param {{}} [poolConfig]
     * @param {String} [poolConfig.defaultConnectionName]
     */
    constructor(poolConfig?: Object | undefined);
    _logger: any;
    /**
     * @type {Map<string, QueueManager>}
     */
    connections: Map<string, QueueManager>;
    defaultConnection: any;
    defaultConnectionName: any;
    setupQueueManagers(connectionConfigs: any): void;
    hasConnection(name: any): boolean;
    getConnection(name: any): QueueManager | undefined;
    createConnection(connectionConfig: any): QueueManager;
    registerConnection(name: any, connection: any): void;
    setDefaultConnection(connection: any): void;
    getDefaultConnection(): any;
    setLogger(logger: any): void;
    /**
     * @return {Promise}
     */
    connect(): Promise<any>;
    /**
     * @return {Promise}
     */
    reconnect(): Promise<any>;
}
import QueueManager from './QueueManager.js';
