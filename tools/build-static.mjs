import {cp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function roomServerOrigin(value){
 if(!value?.trim())return null;
 const url=new URL(value.trim());
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('NEXUS_ROOM_SERVER_URL must be an HTTPS origin, e.g. https://hero-server.example.com (no path, credentials or query).');
 return url.origin;
}

export async function buildStatic({source=resolve('dist'),output=resolve('build'),roomServer=process.env.NEXUS_ROOM_SERVER_URL}={}){
 const origin=roomServerOrigin(roomServer);
 await readFile(resolve(source,'index.html'));
 await rm(output,{recursive:true,force:true});
 await mkdir(output,{recursive:true});
 await cp(source,output,{recursive:true});
 const transport=origin?'websocket':'http';
 await writeFile(resolve(output,'deployment.mjs'),`export const ROOM_SERVER_ORIGIN=${origin?JSON.stringify(origin):'undefined'};\nexport const ROOM_TRANSPORT=${JSON.stringify(transport)};\n`);
 return {output,origin,transport};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const {output,origin}=await buildStatic();
 console.log(`Static game ready: ${output}`);
 console.log(origin?`Room server: ${origin}`:'Vercel rooms use /api/room. Connect Upstash Redis in Vercel Storage; credentials remain on the server.');
}
