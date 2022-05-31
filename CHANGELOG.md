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
