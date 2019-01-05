const loggerMethods = [
  'debug', 'error', 'info', 'log', 'warn', 'dir', 'dirxml', 'table', 'trace', 'group',
  'groupCollapsed', 'groupEnd', 'clear', 'count', 'assert', 'markTimeline', 'profile',
  'profileEnd', 'timeline', 'timelineEnd', 'time', 'timeEnd', 'timeStamp', 'context', 'memory'
]

class ConsoleInspector {
  constructor (logger, options) {
    let { storeLines = true, silent = true } = options || {}
    this.logger = logger
    this.lines = []
    this.storeLines = storeLines
    this.silent = silent
  }

  printLogs (methods) {
    let { whitelist, blacklist } = methods || {}

    this.lines.forEach(({ method, args }) => {
      if (Array.isArray(blacklist) && blacklist.includes(method)) {
        return
      }
      if (!Array.isArray(whitelist) || whitelist.includes(method)) {
        this.logger[method](...args)
      }
    })
  }

  empty () {
    this.lines = []
  }
}

loggerMethods.forEach((method) => {
  ConsoleInspector.prototype[method] = function () {
    if (this.storeLines) {
      this.lines.push({ method, args: arguments })
    }
    if (!this.silent) {
      this.logger[method](...arguments)
    }
  }
})

module.exports = ConsoleInspector
