const {QueueService} = require('techteamer_mq')
const queueConfig = require('./test-queue-config')

module.exports = new QueueService(queueConfig)
