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
