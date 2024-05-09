/// <reference types="node" />
export default QueueConnection;
/**
 * @class QueueConnection
 * */
declare class QueueConnection extends EventEmitter {
    /**
     * @param {Object|QueueConfig} config
     */
    constructor(config: Object | QueueConfig);
    _config: QueueConfig;
    _logger: any;
    _connection: any;
    _connectionPromise: any;
    _channel: any;
    _channelPromise: Promise<any> | null;
    _activeConnectionConfig: any;
    setLogger(logger: any): void;
    /**
     * @return Promise<amqplib.Connection>
     * */
    connect(): Promise<any>;
    emitConnectionEvents(connection: any): void;
    _connect(configUrl: any, options: any): Promise<any>;
    _connectWithMultipleUrls(urls: any, options: any): Promise<any>;
    shuffleUrls(urls: any): any[];
    /**
     * @return Promise
     * */
    close(): Promise<void>;
    /**
     * @return Promise<amqplib.ConfirmChannel>
     * */
    getChannel(): Promise<any>;
    emitChannelEvents(channel: any): void;
}
import EventEmitter from 'node:events';
import QueueConfig from './QueueConfig.js';
