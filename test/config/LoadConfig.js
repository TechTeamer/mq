let config

if (process.env.NODE_ENV === 'travis') {
  config = require('./DefaultConfig')
} else {
  try {
    config = require('./TestConfig')
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`Please rename "test/fixtures/TestConfig.js.config" to "TestConfig.js" and fill in the configuration data.`)
  }
}

module.exports = config
