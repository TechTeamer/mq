/** @type QueueService queueService */
// const queueService = require('./test-queue-service')

process.on('message', (message) => {
  console.log('hello', message)
})
