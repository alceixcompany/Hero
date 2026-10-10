import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildStatic,roomServerOrigin} from '../tools/build-static.mjs';

test('static deployment ships the entire browser module graph, import map and model assets without a server bundle',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nexus-build-')),output=join(dir,'static');
 try{
  await buildStatic({output,roomServer:''});
  const config=await import(pathToFileURL(join(output,'deployment.mjs')));assert.equal(config.ROOM_SERVER_ORIGIN,undefined);assert.equal(config.ROOM_TRANSPORT,'http');
  const html=await readFile(join(output,'index.html'),'utf8');assert.match(html,/app\.mjs\?v=9/);assert.match(html,/vendor\/three\.module\.js/);
  for(const name of await readdir(output)){
   if(!name.endsWith('.mjs'))continue;
   const code=await readFile(join(output,name),'utf8');
   for(const [,spec] of code.matchAll(/(?:from\s*|import\s*\(\s*)['"](\.\.?\/[^'"]+)['"]/g)){
    const target=new URL(spec,pathToFileURL(join(output,name)));target.search='';target.hash='';
    assert.ok((await stat(target)).isFile(),`${name} needs ${spec}`);
   }
  }
  assert.ok((await stat(join(output,'vendor/three.module.js'))).isFile());
  assert.ok((await stat(join(output,'assets/characters'))).isDirectory());
  await assert.rejects(stat(join(output,'server.mjs')),/ENOENT/);
  await assert.rejects(stat(join(output,'.data')),/ENOENT/);
  const vercel=JSON.parse(await readFile(resolve('vercel.json'),'utf8'));assert.equal(vercel.framework,null);assert.equal(vercel.outputDirectory,'build');assert.equal(vercel.buildCommand,'npm run build');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('static deployment exposes only an explicit HTTPS room origin and rejects malformed backend configuration',async()=>{
 assert.equal(roomServerOrigin(' https://rooms.example/ '),'https://rooms.example');
 for(const url of ['http://rooms.example','https://user:secret@rooms.example','https://rooms.example/ws','https://rooms.example/?token=secret','https://rooms.example/#token','not a URL'])assert.throws(()=>roomServerOrigin(url));
 const dir=await mkdtemp(join(tmpdir(),'nexus-backend-'));
 try{
  await buildStatic({output:dir,roomServer:'https://rooms.example/'});
  const config=await import(pathToFileURL(join(dir,'deployment.mjs')));assert.equal(config.ROOM_SERVER_ORIGIN,'https://rooms.example');
 }finally{await rm(dir,{recursive:true,force:true});}
});
