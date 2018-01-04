class ConsoleInspector {
  constructor (logger) {
    this.logger = logger
    this.logArray = []
    this.infoArray = []
    this.errorArray = []
  }

  printLogs () {
    if (this.logArray.length !== 0) {
      this.logger.log('.log calls:')
      this.logArray.forEach((l) => {
        this.logger.log(l)
      })
    }

    if (this.infoArray.length !== 0) {
      this.logger.log('\n.info calls:')
      this.infoArray.forEach((i) => {
        this.logger.log(i)
      })
    }

    if (this.errorArray.length !== 0) {
      this.logger.log('\n.error calls:')
      this.errorArray.forEach((e) => {
        this.logger.log(e)
      })
    }
  }

  log (l) {
    this.logArray.push(l)
  }
  info (i) {
    this.infoArray.push(i)
  }
  error (e) {
    this.errorArray.push(e)
  }

  emptyLog () {
    this.logArray = []
  }

  emptyInfo () {
    this.infoArray = []
  }

  emptyError () {
    this.errorArray = []
  }

  empty () {
    this.emptyLog()
    this.emptyInfo()
    this.emptyError()
  }
}

module.exports = ConsoleInspector
