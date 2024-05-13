/**
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
  branches: ['master', 'next', { name: 'beta', prerelease: true }, { name: 'alpha', prerelease: true }],
  // Default:
  // tagFormat: 'v${version}'
  // eslint-disable-next-line no-template-curly-in-string
  tagFormat: '${version}',
  plugins: ['@semantic-release/commit-analyzer', '@semantic-release/release-notes-generator', '@semantic-release/npm', [
    '@semantic-release/github',
    {
      assets: ['dist/**']
    }
  ],
  '@semantic-release/git'
  ],
  preset: 'angular'
}
