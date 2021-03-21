const redis = require('redis');

var client = redis.createClient();
client.on('connect',()=>{
   console.log('Redis db is connected');
});

module.exports=client;