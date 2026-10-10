import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {RoomService,PRESENCE_MS} from '../hosting/room-service.mjs';
import {READ_SCRIPT,COMMIT_SCRIPT,RedisRest,redisSettings} from '../hosting/redis-rest.mjs';
import {createRoomHandler} from '../api/room.mjs';

import {MemoryRedis,exerciseRooms,token,connection} from './helpers/vercel-fixture.mjs';

test('Vercel instances share rooms, reject simultaneous/stale/duplicate bids, preserve reconnects and reach the same battle result',async()=>{
 await exerciseRooms(new MemoryRedis(),'nexus-test');
});
test('a lost compare-and-set retries from shared state and persistence failure never acknowledges a mutation',async()=>{
 const redis=new MemoryRedis(),body={auth:{type:'create',name:'A',token:token()},connection:connection(),message:{type:'hello'}};
 redis.conflicts=2;const service=new RoomService({redis,key:'test',wait:async()=>{}});const first=await service.request(body);
 const second=await service.request(body);assert.equal(first.messages[0].code,second.messages[0].code);assert.equal(JSON.parse(redis.raw).rooms.length,1);
 redis.fail=true;await assert.rejects(service.request(body),/Unavailable/);
});
test('Vercel Redis environment aliases are private and production/preview databases are isolated',async()=>{
 const creds={KV_REST_API_URL:'https://redis.example',KV_REST_API_TOKEN:'test-secret'};
 assert.equal(redisSettings({}),null);assert.equal(redisSettings(creds).url,'https://redis.example');
 assert.equal(redisSettings(creds).key,redisSettings({UPSTASH_REDIS_REST_URL:creds.KV_REST_API_URL,UPSTASH_REDIS_REST_TOKEN:creds.KV_REST_API_TOKEN}).key);
 assert.notEqual(redisSettings(creds).key,redisSettings({...creds,VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'new-arena'}).key);
 assert.throws(()=>redisSettings({...creds,KV_REST_API_URL:'http://redis.example'}));
 let headers;
 const redis=new RedisRest(redisSettings(creds),{fetcher:async(url,options)=>{headers=options.headers;assert.ok(!url.includes(creds.KV_REST_API_TOKEN));return {ok:true,json:async()=>({result:'OK'})};}});
 assert.equal(await redis.command(['PING']),'OK');assert.equal(headers.Authorization,'Bearer test-secret');
});
test('Vercel HTTP endpoint checks configuration, origin, body size and never exposes storage secrets',async()=>{
 const run=async(handler,req)=>{const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=JSON.parse(v);}};await handler(req,res);return res;};
 const missing=createRoomHandler({settingsFor:()=>null});assert.equal((await run(missing,{method:'GET'})).body.configured,false);
 assert.equal((await run(missing,{method:'POST',headers:{}})).statusCode,503);
 let called=false;const configured=createRoomHandler({settingsFor:()=>({token:'private'}),serviceFor:()=>({request:async()=>{called=true;return {messages:[]};}})});
 const req={method:'POST',headers:{origin:'https://hero.vercel.app',host:'hero.vercel.app','content-type':'application/json'},body:{}};
 assert.equal((await run(configured,{...req,headers:{...req.headers,origin:'https://evil.example'}})).statusCode,403);assert.equal(called,false);
 assert.equal((await run(configured,{...req,body:{big:'x'.repeat(5000)}})).statusCode,413);assert.equal(called,false);
 assert.equal((await run(configured,req)).statusCode,200);assert.equal(called,true);
  const info=await run(configured,{method:'GET'});assert.equal(info.body.configured,true);assert.ok(!JSON.stringify(info).includes('private'));
 const temporary=createRoomHandler({settingsFor:()=>({}),serviceFor:()=>({request:async()=>{throw Error('Temporary network failure');}})});
 const failure=await run(temporary,req);assert.equal(failure.statusCode,503);assert.equal(failure.body.messages[0].code,'unavailable');
});
