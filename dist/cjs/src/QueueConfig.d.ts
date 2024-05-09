export default QueueConfig;
declare class QueueConfig {
    static isValidConfig(obj: any): boolean;
    static urlStringToObject(url: any): any;
    static urlObjectToLogString(urlObject: any): string;
    constructor(config?: {});
    url: any;
    options: RabbitMqOptions;
    rpcTimeoutMs: any;
    rpcQueueMaxSize: any;
    logger: any;
    shuffleUrls: any;
    rpcClientAssertReplyQueueOptions: any;
    rpcClientExchangeOptions: any;
    rpcServerAssertQueueOptions: any;
    rpcServerExchangeOptions: any;
    publisherAssertExchangeOptions: any;
    subscriberAssertQueueOptions: any;
    subscriberAssertExchangeOptions: any;
    gatheringClientAssertQueueOptions: any;
    gatheringClientAssertExchangeOptions: any;
    gatheringServerAssertQueueOptions: any;
    gatheringServerAssertExchangeOptions: any;
    queueClientAssertQueueOptions: any;
    queueServerAssertQueueOptions: any;
}
declare class RabbitMqOptions {
    constructor(options?: {});
    rejectUnauthorized: any;
    cert: any;
    key: any;
    ca: any;
    timeout: any;
}
