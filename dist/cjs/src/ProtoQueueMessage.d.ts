export default ProtoQueueMessage;
declare class ProtoQueueMessage extends QueueMessage {
    static getUnserializeOptions(): {
        enums: StringConstructor;
        longs: NumberConstructor;
        bytes: BufferConstructor;
        defaults: boolean;
        arrays: boolean;
        objects: boolean;
        oneofs: boolean;
    };
    static unserialize(buffer: any, ContentSchema: any): ProtoQueueMessage;
    serialize(): any;
}
import QueueMessage from './QueueMessage.js';
