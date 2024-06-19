TechTeamer MQ
=============

[![npm](https://img.shields.io/npm/v/@techteamer/mq.svg)](https://www.npmjs.com/package/@techteamer/mq)
[![Build Status](https://app.travis-ci.com/TechTeamer/mq.svg?branch=master)](https://app.travis-ci.com/github/TechTeamer/mq/)
[![Coverage Status](https://coveralls.io/repos/github/TechTeamer/mq/badge.svg?branch=master)](https://coveralls.io/github/TechTeamer/mq?branch=master)

A RabbitMQ wrapper for node

## Install

```
yarn add @techteamer/mq
```

## Build

```
yarn run build
```

## Tests

To run tests you need to rename `test/config/TestConfig.js.config` to `TestConfig.js` and provide valid configurations.

Then run:

```
yarn test
```

## Publish

**Before publish always run the build process!** This will create the `dist` folder, which will be needed in the published package.


