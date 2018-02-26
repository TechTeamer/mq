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
