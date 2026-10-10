import {createHash} from 'node:crypto';

export function redisSettings(env=process.env){
 const url=env.KV_REST_API_URL||env.UPSTASH_REDIS_REST_URL;
 const token=env.KV_REST_API_TOKEN||env.UPSTASH_REDIS_REST_TOKEN;
 if(!url||!token)return null;
 const endpoint=new URL(url);
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password)throw Error('Invalid Redis configuration');
 const scope=env.NEXUS_ROOM_NAMESPACE||env.VERCEL_PROJECT_ID||'hero';
 const branch=env.VERCEL_ENV==='preview'?`preview:${env.VERCEL_GIT_COMMIT_REF||env.VERCEL_URL||'preview'}`:'production';
 const namespace=createHash('sha256').update(scope+':'+branch).digest('hex').slice(0,24);
 return {url:endpoint.origin,token,key:`nexus:v2:${namespace}`};
}

export class RedisRest{
 constructor(settings,{fetcher=fetch,timeoutMs=4000}={}){this.settings=settings;this.fetcher=fetcher;this.timeoutMs=timeoutMs;}
 async command(args){
  const response=await this.fetcher(this.settings.url,{method:'POST',headers:{Authorization:`Bearer ${this.settings.token}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(this.timeoutMs)});
  if(!response.ok)throw Error('Room storage unavailable');
  const data=await response.json();if(data.error)throw Error('Room storage unavailable');return data.result;
 }
}

// Count requests and read one consistent dataset in a single Redis round trip.
export const READ_SCRIPT=`
local count=redis.call('INCR',KEYS[2])
if count==1 then redis.call('EXPIRE',KEYS[2],60) end
if count>300 then return {'rate'} end
if ARGV[1]=='hello' then
 local hellos=redis.call('INCR',KEYS[3])
 if hellos==1 then redis.call('EXPIRE',KEYS[3],60) end
 if hellos>30 then return {'rate'} end
end
return {'ok',redis.call('GET',KEYS[1]) or ''}`;

// A late/stopped function cannot overwrite a newer function's accepted bid.
export const COMMIT_SCRIPT=`
local current=redis.call('GET',KEYS[1]) or ''
if current~=ARGV[1] then return 0 end
redis.call('SET',KEYS[1],ARGV[2],'EX',86400)
return 1`;
