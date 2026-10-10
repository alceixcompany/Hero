// Optional real Redis integration check, using a fresh isolated namespace.
// Credentials are read only from this process's environment and never printed.
import {randomBytes,createHash} from 'node:crypto';
import {RedisRest} from '../hosting/redis-rest.mjs';
import {exerciseRooms} from '../tests/helpers/vercel-fixture.mjs';
const url=process.env.NEXUS_TEST_REDIS_URL,token=process.env.NEXUS_TEST_REDIS_TOKEN;
if(!url||!token)throw Error('Provide NEXUS_TEST_REDIS_URL and NEXUS_TEST_REDIS_TOKEN for a temporary test database.');
const redis=new RedisRest({url,token},{timeoutMs:15000}),key='nexus:test:'+randomBytes(16).toString('hex');
try{await exerciseRooms(redis,key);console.log('Real Redis: concurrent bids, retries, reconnect, hidden lots and complete battle passed.');}
finally{const rate=createHash('sha256').update('synthetic-test').digest('hex').slice(0,24);await redis.command(['DEL',key,key+':rate:'+rate,key+':hello:'+rate]);}
