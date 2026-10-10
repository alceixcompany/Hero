import * as THREE from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const clamp=x=>Math.max(0,Math.min(1,x));
const fade=p=>Math.sin(Math.PI*clamp((p-.13)/.8));
function line(points,color,opacity=.7){return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));}
function circle(radius,color){const m=new THREE.Mesh(new THREE.TorusGeometry(radius,.018,6,72),new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));return m;}
export function encounterEffects(parent,{style,id,color,finisher=false,reduced=false}){
 const root=new THREE.Group(),prison=new THREE.Group(),slashes=new THREE.Group(),signature=new THREE.Group();root.add(prison,slashes,signature);parent.add(root);
 const rings=[],bars=[],arcs=[],rays=[];
 if(style==='magic'){
  for(let i=0;i<3;i++){const r=circle(.9+i*.15,color);r.position.y=.2+i*.8;r.rotation.x=i===1?0:-Math.PI/2;r.rotation.z=i===1?Math.PI/4:0;prison.add(r);rings.push(r);}
  for(let i=0;i<8;i++){
   const angle=i*Math.PI/4,x=Math.cos(angle)*1.02,z=Math.sin(angle)*1.02;
   const bar=line([V(x,.1,z),V(x,2.6,z)],color,.35);prison.add(bar);bars.push(bar);
   const rune=new THREE.Mesh(new THREE.OctahedronGeometry(id==='magneto'?.12:.055),new THREE.MeshStandardMaterial({color,metalness:id==='magneto'?.8:.2,roughness:.3,emissive:color,emissiveIntensity:.7,transparent:true,opacity:0}));rune.position.set(x,1.4,z);prison.add(rune);bars.push(rune);
  }
 }
 if(style==='blade'||style==='brawl')for(let i=0;i<2;i++){
  const a=new THREE.Mesh(new THREE.TorusGeometry(style==='blade'?.9:.48,style==='blade'?.024:.035,6,40,Math.PI*1.4),new THREE.MeshBasicMaterial({color:style==='blade'?'#e4f5ff':color,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));a.rotation.z=i?-.7:.7;slashes.add(a);arcs.push(a);
 }
 if(finisher){
  const thunder=['thor','storm'].includes(id),brute=['hulk','groot'].includes(id),web=id==='spiderman';
  for(let i=0;i<12;i++){
   const angle=i*Math.PI/6,points=[];
   if(thunder){for(let j=0;j<9;j++)points.push(V(Math.sin(i*9+j*13)*.18,2+j*.6,Math.cos(i*8+j*11)*.18));}
   else if(web){for(let j=0;j<=12;j++)points.push(V(Math.cos(angle)*j*.12,1.2+Math.sin(j*.28)*.5,Math.sin(angle)*j*.12));}
   else points.push(V(Math.cos(angle)*.5,brute?.09:1.3,Math.sin(angle)*.5),V(Math.cos(angle)*(brute?2.4:1.7),brute?.09:1.3+(i%2?-.35:.35),Math.sin(angle)*(brute?2.4:1.7)));
   const ray=line(points,color,0);signature.add(ray);rays.push(ray);
  }
  for(let i=0;i<2;i++){const c=circle(.65+i*.25,color);c.rotation.x=-Math.PI/2;c.position.y=.08+i*.1;signature.add(c);rays.push(c);}
 }
 return {update({p,attacker,target,dir,attackerLift=0,targetLift=0,dodge=false}){
  const active=!reduced;prison.visible=active&&style==='magic';slashes.visible=active;signature.visible=active&&finisher&&p>=.48&&!dodge;
  prison.position.copy(target);prison.position.y+=targetLift;prison.rotation.y=p*(id==='magneto'?3:1.4);
  for(const [i,r] of rings.entries()){r.material.opacity=fade(p)*.6;r.rotation.z=p*(i%2?2:-2);r.scale.setScalar(.85+Math.sin(p*Math.PI)*.2);}
  for(const [i,b] of bars.entries()){b.material.opacity=fade(p)*(b.isLine?.28:.9);if(b.isMesh){b.rotation.y=p*5;b.position.y=1.3+Math.sin(p*8+i)*.3;}}
  slashes.position.copy(attacker).addScaledVector(dir,.8);slashes.position.y+=attackerLift+1.35;slashes.rotation.y=Math.atan2(dir.x,dir.z);
  for(const [i,a] of arcs.entries()){const q=clamp((p-(i?.39:.28))/.12);a.material.opacity=Math.sin(q*Math.PI)*.8;a.rotation.y=(q-.5)*(i?1:-1);}
  signature.position.copy(target);signature.position.y+=targetLift;const q=clamp((p-.48)/.52);
  rays.forEach((r,i)=>{r.material.opacity=Math.sin(Math.PI*q)*.7;r.scale.setScalar(1+q*(i<12?1.2:4));});
 }};
}
