export default QueueClient;
declare class QueueClient extends Publisher {
    _assertQueue: boolean;
    _assertQueueOptions: any;
}
import Publisher from './Publisher.js';
