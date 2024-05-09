export default QueueResponse;
declare class QueueResponse {
    statusMessage: string;
    statusCode: string;
    attachments: Map<any, any>;
    get statuses(): {
        OK: string;
        NOT_FOUND: string;
        ERROR: string;
    };
    get OK(): string;
    get NOT_FOUND(): string;
    get ERROR(): string;
    /**
     * @param statusCode
     * @param [statusMessage]
     */
    setStatus(statusCode: any, statusMessage?: any): void;
    ok(statusMessage: any): void;
    notFound(statusMessage: any): void;
    error(statusMessage: any): void;
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
