let config

if (process.env.NODE_ENV === 'travis') {
  config = require('./DefaultConfig')
} else {
  config = require('./TestConfig')
}

module.exports = config
