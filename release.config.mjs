/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  branches: ['master', { name: 'beta', prerelease: true }],
  // eslint-disable-next-line no-template-curly-in-string
  tagFormat: '${version}',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md'
      }
    ],
    '@semantic-release/npm',
    '@semantic-release/github',
    '@semantic-release/git'
  ],
  preset: 'angular'
}
