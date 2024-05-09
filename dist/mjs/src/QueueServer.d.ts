export default QueueServer;
declare class QueueServer extends Subscriber {
    _assertQueue: boolean;
    _prefetchCount: any;
}
import Subscriber from './Subscriber.js';
