"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_url_1 = require("node:url");
class RabbitMqOptions {
    constructor(options = {}) {
        const { rejectUnauthorized = false, cert = '', key = '', ca = [] } = options;
        this.rejectUnauthorized = rejectUnauthorized;
        this.cert = cert;
        this.key = key;
        this.ca = ca;
        if (options.timeout) {
            this.timeout = options.timeout;
        }
    }
}
class QueueConfig {
    constructor(config = {}) {
        const { url = 'amqps://localhost:5672', options = {}, rpcTimeoutMs = 10000, rpcQueueMaxSize = 100, logger = console, shuffleUrls = false, 
        // Queue & exchange options
        rpcClientAssertReplyQueueOptions = {}, rpcClientExchangeOptions = {}, rpcServerAssertQueueOptions = {}, rpcServerExchangeOptions = {}, publisherAssertExchangeOptions = {}, subscriberAssertQueueOptions = {}, subscriberAssertExchangeOptions = {}, gatheringClientAssertQueueOptions = {}, gatheringClientAssertExchangeOptions = {}, gatheringServerAssertQueueOptions = {}, gatheringServerAssertExchangeOptions = {}, queueClientAssertQueueOptions = {}, queueServerAssertQueueOptions = {} } = config;
        const rabbitMqOptions = new RabbitMqOptions(options);
        this.url = url;
        this.options = rabbitMqOptions;
        this.rpcTimeoutMs = rpcTimeoutMs;
        this.rpcQueueMaxSize = rpcQueueMaxSize;
        this.logger = logger;
        this.shuffleUrls = shuffleUrls;
        // Queue & exchange options
        this.rpcClientAssertReplyQueueOptions = rpcClientAssertReplyQueueOptions;
        this.rpcClientExchangeOptions = rpcClientExchangeOptions;
        this.rpcServerAssertQueueOptions = rpcServerAssertQueueOptions;
        this.rpcServerExchangeOptions = rpcServerExchangeOptions;
        this.publisherAssertExchangeOptions = publisherAssertExchangeOptions;
        this.subscriberAssertQueueOptions = subscriberAssertQueueOptions;
        this.subscriberAssertExchangeOptions = subscriberAssertExchangeOptions;
        this.gatheringClientAssertQueueOptions = gatheringClientAssertQueueOptions;
        this.gatheringClientAssertExchangeOptions = gatheringClientAssertExchangeOptions;
        this.gatheringServerAssertQueueOptions = gatheringServerAssertQueueOptions;
        this.gatheringServerAssertExchangeOptions = gatheringServerAssertExchangeOptions;
        this.queueClientAssertQueueOptions = queueClientAssertQueueOptions;
        this.queueServerAssertQueueOptions = queueServerAssertQueueOptions;
    }
    static isValidConfig(obj) {
        return !!(obj && obj.url);
    }
    static urlStringToObject(url) {
        if (typeof url !== 'string') {
            return url;
        }
        const parsedUrl = new node_url_1.URL(url);
        return {
            protocol: parsedUrl.protocol ? parsedUrl.protocol.slice(0, -1) : undefined,
            hostname: parsedUrl.hostname ? parsedUrl.hostname : undefined,
            port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : undefined,
            username: parsedUrl.username ? parsedUrl.username : undefined,
            password: parsedUrl.password ? parsedUrl.password : undefined,
            vhost: parsedUrl.pathname ? parsedUrl.pathname.slice(1) : undefined
        };
    }
    static urlObjectToLogString(urlObject) {
        return [
            urlObject.protocol || 'amqps',
            '://',
            urlObject.hostname,
            urlObject.port ? `:${urlObject.port}` : '',
            urlObject.vhost ? `/${urlObject.vhost}` : ''
        ].join('');
    }
}
exports.default = QueueConfig;
