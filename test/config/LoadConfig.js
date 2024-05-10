let config
if (process.env.NODE_ENV === 'travis') {
  config = (await import('./DefaultConfig.js')).default
} else {
  try {
    config = (await import('./TestConfig.js')).default // eslint-disable-line n/no-missing-require
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Please rename "test/fixtures/TestConfig.js.config" to "TestConfig.js" and fill in the configuration data.')
  }
}
export default config
