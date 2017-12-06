module.exports = {
  'url': 'amqps://localhost:5672',
  'options': {
    'rejectUnauthorized': false,
    'cert': '/workspace/vuer_mq_cert/client/cert.pem',
    'key': '/workspace/vuer_mq_cert/client/key.pem',
    'ca': ['/workspace/vuer_mq_cert/ca/cacert.pem']
  },
  'rpcTimeoutMs': 10000,
  'rpcQueueMaxSize': 100
}
