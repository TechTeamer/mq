## [7.0.4-beta.1](https://github.com/TechTeamer/mq/compare/7.0.3...7.0.4-beta.1) (2024-08-21)


### Bug Fixes

* jsdoc ([#52](https://github.com/TechTeamer/mq/issues/52)) ([5efbf4f](https://github.com/TechTeamer/mq/commit/5efbf4fca82c8ba6a955aa5c9289e20c02aad485))

## [7.0.3](https://github.com/TechTeamer/mq/compare/7.0.2...7.0.3) (2024-08-12)


### Bug Fixes

* adding back github release to semantic release config ([#68](https://github.com/TechTeamer/mq/issues/68)) ([dd67d48](https://github.com/TechTeamer/mq/commit/dd67d4847394cbd657815805f6b0461429273459))

## [7.0.3-beta.1](https://github.com/TechTeamer/mq/compare/7.0.2...7.0.3-beta.1) (2024-08-12)


### Bug Fixes

* adding back github release to semantic release config ([#68](https://github.com/TechTeamer/mq/issues/68)) ([dd67d48](https://github.com/TechTeamer/mq/commit/dd67d4847394cbd657815805f6b0461429273459))

## [7.0.2](https://github.com/TechTeamer/mq/compare/7.0.1...7.0.2) (2024-08-12)


### Bug Fixes

* remove github artifact publishing ([#67](https://github.com/TechTeamer/mq/issues/67)) ([ac55799](https://github.com/TechTeamer/mq/commit/ac55799a0e4bac115d93b18ce9428997489fe6ef))

## [7.0.1](https://github.com/TechTeamer/mq/compare/7.0.0...7.0.1) (2024-08-07)


### Bug Fixes

* add build step to workflow ([#66](https://github.com/TechTeamer/mq/issues/66)) ([d61a704](https://github.com/TechTeamer/mq/commit/d61a7045af481be74046439350f1bb380d414287))

# [7.0.0](https://github.com/TechTeamer/mq/compare/6.3.2...7.0.0) (2024-06-19)


### Bug Fixes

* **ci:** add permissions ([9b7351a](https://github.com/TechTeamer/mq/commit/9b7351a0db9507f310b9f079b070625e61bbe324))
* commit rules ([d0b8134](https://github.com/TechTeamer/mq/commit/d0b8134db9122f644f7e86de5208a0255dd3528a))
* remove commitlint upgrade semantic release ([#63](https://github.com/TechTeamer/mq/issues/63)) ([4fbd888](https://github.com/TechTeamer/mq/commit/4fbd8888d50e5d3dc3bee8012411cd87760abf70))
* set changelog path ([486dd3c](https://github.com/TechTeamer/mq/commit/486dd3c643e37a65cdfeb897b9c9473af0334697))


### Build System

* **deps:** bump minimum node to v20 ([1585212](https://github.com/TechTeamer/mq/commit/1585212b77805852f3d3e5381f3098d766e023cb))


### Features

* module migration to beta FKITDEV-3756 ([#61](https://github.com/TechTeamer/mq/issues/61)) ([885cea8](https://github.com/TechTeamer/mq/commit/885cea857b26b71504a3ff17d9fa91cff1409745))
* **semver:** setup semantic release ([cc4daf1](https://github.com/TechTeamer/mq/commit/cc4daf1b310d45cf43b620a8bff518b984a55328))


### BREAKING CHANGES

* **deps:** drop support for node <20.8.1

# [7.0.0-beta.1](https://github.com/TechTeamer/mq/compare/6.4.0-beta.4...7.0.0-beta.1) (2024-06-07)


### Build System

* **deps:** bump minimum node to v20 ([1585212](https://github.com/TechTeamer/mq/commit/1585212b77805852f3d3e5381f3098d766e023cb))


### BREAKING CHANGES

* **deps:** drop support for node <20.8.1

# [6.4.0-beta.4](https://github.com/TechTeamer/mq/compare/6.4.0-beta.3...6.4.0-beta.4) (2024-06-07)


### Bug Fixes

* remove commitlint upgrade semantic release ([#63](https://github.com/TechTeamer/mq/issues/63)) ([4fbd888](https://github.com/TechTeamer/mq/commit/4fbd8888d50e5d3dc3bee8012411cd87760abf70))

# [6.4.0-beta.3](https://github.com/TechTeamer/mq/compare/6.4.0-beta.2...6.4.0-beta.3) (2024-06-05)


### Features

* module migration to beta FKITDEV-3756 ([#61](https://github.com/TechTeamer/mq/issues/61)) ([885cea8](https://github.com/TechTeamer/mq/commit/885cea857b26b71504a3ff17d9fa91cff1409745))

# [6.4.0-beta.2](https://github.com/TechTeamer/mq/compare/6.4.0-beta.1...6.4.0-beta.2) (2024-05-28)


### Bug Fixes

* set changelog path ([486dd3c](https://github.com/TechTeamer/mq/commit/486dd3c643e37a65cdfeb897b9c9473af0334697))

6.3.2
- fix the reconnecting
- updated dependencies

6.3.1
- fixed error emitting logic
- updated and upgraded dependencies

6.3.0
- added option to shuffle connection urls

6.2.0
- added option to set global defaults for queue and exchange assertion
- emit Channel events (close, error, drain, return)
- updated and upgraded dependencies

6.1.0
- added backward compatibility for object based connection URL configuration

6.0.0
- BREAKING: removed process.exit on connection close
- BREAKING: connection configs only support string AMQP URI syntax (https://www.rabbitmq.com/uri-spec.html)
- connection events are emitted (error, close, blocked, unblocked)
- ability to reconnect
- supports only node v16+

5.2.0
- option to use direct exchange for RPC
- autodelete for random (empty named) queues

5.1.0
- handle multiple connection urls and hosts

5.0.2
- add options to configure deserialization of ProtoQueueMessage

5.0.1
- export ProtoQueueMessage class

5.0.0
- added Protobuf support
- added more options to configure queue and exchange assertions
- updated and upgraded dependencies
- added option to exit on connection closing

4.1.4
- dependency updates
- minimum requirement is node v14

4.1.3
- dependency updates
- pass raw msg param to handler callbacks (#31)

4.1.2
- dependency updates, drop support for node v10

4.1.1
- dependency updates

4.1.0
- promises rewrite to async-await in most cases
- connections and channels are built up one-after-one, previously promise.all was used to register channels/create connections
- removed unnecessary depencency introduced in 2.4.1

4.0.0
- drop support for node v8
- dependency upgrade

3.0.0
- drop support for node v6
- add option to RabbitMQ connection timeout

2.4.1
- dependency update to fix security vulnerability

2.4.0
- RPC reply attachment

2.3.0
- Collection Pool

2.2.1
- Fix multi-byte character (de)serialization

2.2.0
- Binary sending is available

2.1.0
- auto init existing servers on connection
- Constructor overrides

2.0.1
- Prevent simultaneous initializations

2.0.0
- Implemented Publish / Subscribe
- `QueueClient` extends `Publisher`
- `QueueServer` extends `Subscriber`
- Pass `options` Object to constructors
- `QueueManager` methods use `options` parameters
- `initialize()` methods are not called in the constructor
   (They should be called manually because they are async)
- Tests (new and fixed)
