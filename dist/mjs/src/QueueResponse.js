const OK = 'OK';
const NOT_FOUND = 'NOT_FOUND';
const ERROR = 'ERROR';
const statuses = {
    [OK]: OK,
    [NOT_FOUND]: NOT_FOUND,
    [ERROR]: ERROR
};
class QueueResponse {
    constructor() {
        this.statusMessage = '';
        this.statusCode = '';
        this.attachments = new Map();
    }
    get statuses() {
        return statuses;
    }
    get OK() {
        return OK;
    }
    get NOT_FOUND() {
        return NOT_FOUND;
    }
    get ERROR() {
        return ERROR;
    }
    /**
     * @param statusCode
     * @param [statusMessage]
     */
    setStatus(statusCode, statusMessage = this.statuses[statusCode]) {
        this.statusCode = statusCode;
        this.statusMessage = statusMessage;
    }
    ok(statusMessage) {
        this.setStatus(this.OK, statusMessage);
    }
    notFound(statusMessage) {
        this.setStatus(this.NOT_FOUND, statusMessage);
    }
    error(statusMessage) {
        this.setStatus(this.ERROR, statusMessage);
    }
    /**
     * @param {String} name
     * @param {Buffer} buffer
     */
    addAttachment(name, buffer) {
        this.attachments.set(name, buffer);
    }
    /**
     * @param {String} name
     * @returns {Buffer}
     */
    getAttachment(name) {
        return this.attachments.get(name);
    }
    /**
     * @param {String} name
     * @returns {boolean}
     */
    hasAttachment(name) {
        return this.attachments.has(name);
    }
    /**
     * @returns {boolean}
     */
    hasAnyAttachments() {
        return this.attachments.size > 0;
    }
    /**
     * @returns {Map<String, Buffer>}
     */
    getAttachments() {
        return this.attachments;
    }
}
export default QueueResponse;
