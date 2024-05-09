export default QueueMessage;
declare class QueueMessage {
    static fromJSON(jsonString: any): QueueMessage;
    /**
     * @param {Buffer} buffer
     * @param ContentSchema
     * @returns {QueueMessage}
     */
    static unserialize(buffer: Buffer, ContentSchema?: JSON): QueueMessage;
    constructor(status: any, data: any, timeOut: any, ContentSchema?: JSON);
    status: any;
    data: any;
    timeOut: any;
    attachments: Map<any, any>;
    ContentSchema: JSON;
    serialize(): Buffer;
    /**
     * @param {String} name
     * @param {Buffer} buffer
     */
    addAttachment(name: string, buffer: Buffer): void;
    /**
     * @param {String} name
     * @returns {Buffer}
     */
    getAttachment(name: string): Buffer;
    /**
     * @param {String} name
     * @returns {boolean}
     */
    hasAttachment(name: string): boolean;
    /**
     * @returns {boolean}
     */
    hasAnyAttachments(): boolean;
    /**
     * @returns {Map<String, Buffer>}
     */
    getAttachments(): Map<string, Buffer>;
}
