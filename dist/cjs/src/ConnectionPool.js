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
const QueueManager_js_1 = __importDefault(require("./QueueManager.js"));
const QueueConfig_js_1 = __importDefault(require("./QueueConfig.js"));
/**
 * @class ConnectionPool
 * */
class ConnectionPool {
    /**
     * @param {Object} poolConfig
     * @param {{}} [poolConfig]
     * @param {String} [poolConfig.defaultConnectionName]
     */
    constructor(poolConfig) {
        const { defaultConnectionName } = poolConfig || {};
        this._logger = null;
        /**
         * @type {Map<string, QueueManager>}
         */
        this.connections = new Map();
        this.defaultConnection = null;
        this.defaultConnectionName = defaultConnectionName || 'default';
    }
    setupQueueManagers(connectionConfigs) {
        const defaultConnectionName = this.defaultConnectionName;
        let defaultConnectionConfig = null;
        let restConnections = null;
        if (QueueConfig_js_1.default.isValidConfig(connectionConfigs)) {
            // single connection config (backwards compatible)
            defaultConnectionConfig = connectionConfigs;
            restConnections = null;
        }
        else {
            // multi connection config
            defaultConnectionConfig = connectionConfigs[defaultConnectionName];
            if (QueueConfig_js_1.default.isValidConfig(defaultConnectionConfig)) {
                // default connection
                delete connectionConfigs[defaultConnectionName];
                // the rest of the connection configs
                restConnections = connectionConfigs;
            }
            else {
                this._logger.error('Invalid default connections config', defaultConnectionConfig);
                throw new Error('Invalid default connections config');
            }
        }
        if (defaultConnectionConfig) {
            const connection = this.createConnection(defaultConnectionConfig);
            this.registerConnection(defaultConnectionName, connection);
            this.setDefaultConnection(connection);
        }
        if (restConnections) {
            Object.keys(restConnections).forEach((connectionName) => {
                const connectionConfig = restConnections[connectionName];
                const connection = this.createConnection(connectionConfig);
                this.registerConnection(connectionName, connection);
            });
        }
    }
    hasConnection(name) {
        return this.connections.has(name);
    }
    getConnection(name) {
        return this.connections.get(name);
    }
    createConnection(connectionConfig) {
        const connection = new QueueManager_js_1.default(connectionConfig);
        if (this._logger) {
            connection.setLogger(this._logger);
        }
        return connection;
    }
    registerConnection(name, connection) {
        this.connections.set(name, connection);
    }
    setDefaultConnection(connection) {
        this.defaultConnection = connection;
    }
    getDefaultConnection() {
        return this.defaultConnection;
    }
    setLogger(logger) {
        this._logger = logger;
    }
    /**
     * @return {Promise}
     */
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            const connections = [...this.connections.values()];
            for (const connection of connections) {
                yield connection.connect();
            }
        });
    }
    /**
     * @return {Promise}
     */
    reconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            const connections = [...this.connections.values()];
            for (const connection of connections) {
                yield connection.reconnect();
            }
        });
    }
}
exports.default = ConnectionPool;
