const redis = require("redis")
const client = redis.createClient(6379, process.env.REDIS_HOST || '127.0.0.1');
client.select(3);

client.on('error', function (error) {
  console.error('Session error!' + JSON.stringify(error));
});

module.exports = client