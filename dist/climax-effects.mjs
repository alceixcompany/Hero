import * as THREE from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=n=>Math.max(0,Math.min(1,n));
function beam(parent,color){const g=new THREE.BufferGeometry().setFromPoints([V(),V()]),m=new THREE.LineBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),l=new THREE.Line(g,m);parent.add(l);return l;}
function setBeam(line,a,b,opacity){const attr=line.geometry.attributes.position;attr.setXYZ(0,a.x,a.y,a.z);attr.setXYZ(1,b.x,b.y,b.z);attr.needsUpdate=true;line.geometry.computeBoundingSphere();line.material.opacity=opacity;}
export function climaxEffects(parent,{kind,color,glow,reduced=false}){
 const root=new THREE.Group();parent.add(root);const pieces=[],rays=[],clouds=[];
 const metal=new THREE.MeshStandardMaterial({color:kind==='chaos'?'#51414d':'#413942',metalness:.6,roughness:.4,emissive:color,emissiveIntensity:0,transparent:true});
 const count=kind==='chaos'?12:kind==='arsenal'?6:0;
 for(let i=0;i<count;i++){
  const mesh=new THREE.Mesh(kind==='chaos'?new THREE.BoxGeometry(.24+(i%3)*.07,.14,.22):new THREE.CylinderGeometry(.045,.1,.48,8),metal);if(kind==='arsenal')mesh.rotation.x=Math.PI/2;root.add(mesh);pieces.push(mesh);rays.push(beam(root,color));
 }
 if(kind==='storm')for(let i=0;i<6;i++){
  const cloud=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:'#17273e',transparent:true,opacity:0,depthWrite:false}));cloud.position.set(Math.sin(i*8)*5,7+i%2,-3+Math.cos(i*9)*3);cloud.scale.set(9,5,1);root.add(cloud);clouds.push(cloud);
  const points=[];for(let j=0;j<12;j++)points.push(V(Math.sin(i*7+j*11)*.18,j*.68,Math.cos(i*8+j*9)*.18));
  const bolt=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));root.add(bolt);rays.push(bolt);
 }
 if(kind==='arsenal')for(let i=0;i<3;i++)rays.push(beam(root,i===2?'#dcf6ff':color));
 const core=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));root.add(core);
 return {root,kind,update({phase,p,clock,attacker,target,lift=0,targetLift=0,cancelled=false}){
  const charging=phase==='charge',power=cancelled&&charging?.06:charging?.25+clamp(p)*.7:cancelled?1-clamp(p*3):Math.sin(Math.PI*clamp(p));
  root.visible=power>.001;metal.emissiveIntensity=power*(kind==='chaos'?1.4:.3);metal.opacity=cancelled?power:1;
  const chest=attacker.clone().add(V(0,lift+1.8,0)),hit=target.clone().add(V(0,targetLift+1.4,0));
  core.position.copy(chest);core.scale.setScalar(kind==='chaos'?2:kind==='storm'?2.5:1.35);core.material.opacity=reduced?.12:power*.55;
  clouds.forEach((c,i)=>{c.material.opacity=reduced?.1:power*.65;c.position.x=Math.sin(i*8+(reduced?0:clock*.035))*5;});
  pieces.forEach((m,i)=>{
   const angle=i*Math.PI*2/count+(reduced?0:clock*.25),start=kind==='chaos'?attacker.clone().add(V(Math.cos(angle)*1.4,charging?.15+power*(.7+(i%4)*.5):1.3+(i%4)*.4,Math.sin(angle)*1.4)):chest.clone().add(V(i%2?.48:-.48,.1+(i%3)*.17,0));
   const launch=charging||cancelled?0:clamp((p-.2-i*.025)/.3);
   m.position.copy(start).lerp(hit,launch);m.rotation.y=kind==='chaos'?angle:Math.atan2(hit.x-start.x,hit.z-start.z);if(kind==='chaos')m.rotation.x=(reduced?0:clock*.4)+i;
   m.visible=charging||cancelled||launch<1;
   setBeam(rays[i],start,m.position,charging?0:reduced?.12:power*.8);
  });
  if(kind==='storm')rays.forEach((r,i)=>{r.position.copy(charging?attacker:target);r.position.x+=Math.sin(i*9)*(.25+(charging?1:.7));r.position.z+=Math.cos(i*11)*.7;r.position.y=charging?lift+1:targetLift+.1;r.material.opacity=reduced?0:charging?(Math.sin(clock*2+i)>.85?power*.16:0):cancelled?0:power*.75;});
  if(kind==='arsenal')for(let i=0;i<3;i++){const origin=chest.clone().add(V(i===2?0:i?-.4:.4,i===2?-.15:.2,.2));setBeam(rays[count+i],origin,hit,charging||cancelled?0:reduced?.15:power*.75);}
 },dispose(){root.removeFromParent();const geometry=new Set(),materials=new Set();root.traverse(n=>{if(n.geometry)geometry.add(n.geometry);if(n.material)materials.add(n.material);});geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
