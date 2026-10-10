import * as THREE from './vendor/three.module.js';
import {hero} from './engine.mjs';
import {coverAt} from './battle-terrain.mjs';
import {positionFor} from './strategy.mjs';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=n=>Math.max(0,Math.min(1,n));
function clear(group){
 const geometries=new Set(),materials=new Set();group.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)materials.add(n.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.clear();
}
const leavesMark=e=>!e.dodge&&(['hulk','groot'].includes(e.attacker)&&(e.special||e.crit)||['thor','storm'].includes(e.attacker)&&e.special||e.terrain?.some(c=>c.broken));
const seedFor=(e,index)=>[...e.attacker].reduce((v,c)=>v+c.charCodeAt(0),index*17+e.round*31);
const fraction=(seed,i)=>{const n=Math.sin(seed*12.9898+i*78.233)*43758.5453;return n-Math.floor(n);};
function crack(parent,point,radius,seed){
 const group=new THREE.Group();group.position.copy(point);group.position.y=point.y+.035;parent.add(group);
 const vertices=[];
 for(let branch=0;branch<7;branch++){
  const angle=branch*Math.PI*2/7+fraction(seed,branch)*.2;let before=V();
  for(let j=1;j<=5;j++){
   const r=radius*j/5,side=(fraction(seed,branch*9+j)-.5)*radius*.28;
   const next=V(Math.cos(angle)*r-Math.sin(angle)*side,0,Math.sin(angle)*r+Math.cos(angle)*side);vertices.push(before,next);
   if(j===3){vertices.push(next,next.clone().add(V(Math.cos(angle+.8)*radius*.3,0,Math.sin(angle+.8)*radius*.3)));}before=next;
  }
 }
 const geometry=new THREE.BufferGeometry().setFromPoints(vertices),lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#0b1119',transparent:true,opacity:.8,depthWrite:false}));lines.renderOrder=2;group.add(lines);
 // Displaced shards make the fractured surface readable from the overhead camera.
 const shardMat=new THREE.MeshStandardMaterial({color:'#354253',metalness:.25,roughness:.88});
 for(let i=0;i<8;i++){
  const angle=i*Math.PI/4,mesh=new THREE.Mesh(new THREE.TetrahedronGeometry(.06+fraction(seed,i+53)*.08),shardMat);mesh.position.set(Math.cos(angle)*radius*.27,.015,Math.sin(angle)*radius*.27);mesh.scale.y=.3;mesh.rotation.y=angle;mesh.receiveShadow=true;group.add(mesh);
 }
 return group;
}
export class EnvironmentReactions{
 constructor(env,{props,glow,map,reduced=false}={}){
  this.props=props;this.glow=glow;this.map=map;this.reduced=reduced;this.root=new THREE.Group();env.add(this.root);this.marks=new THREE.Group();this.transient=new THREE.Group();this.root.add(this.marks,this.transient);this.seen=new Set();this.bursts=[];this.time=0;
  this.flash=new THREE.DirectionalLight('#b9dbff',0);this.flash.position.set(-2,12,5);env.add(this.flash);this.flashEnergy=0;
 }
 reset(){clear(this.marks);clear(this.transient);this.seen.clear();this.bursts=[];this.flashEnergy=0;this.flash.intensity=0;}
 sync(b,pending=null,restoring=false){
  if(this.battle!==b){this.reset();this.battle=b;}
  const events=b?.events||[],pendingIndex=pending&&!restoring?events.indexOf(pending):-1;
  const end=pendingIndex>=0?pendingIndex:events.length;
  const unseen=events.slice(0,end).map((e,index)=>({e,index})).filter(({index})=>!this.seen.has(index));
  unseen.forEach(({index})=>this.seen.add(index));
  // Catch up permanent damage when polling skips an event; only live contact replays particles.
  for(const {e,index} of unseen.filter(({e})=>leavesMark(e)).slice(-14)){
   const f=b.fighters[1-e.side].find(f=>f.id===e.target);
   this.mark(e,b,V(...positionFor(f.slot,f.side)),index);
  }
  this.syncCover(b,pending);
 }
 syncCover(b,pending=null){
  for(const prop of this.props.values()){
   const change=pending?.terrain?.find(c=>c.side===prop.side&&c.slot===prop.slot),c=coverAt(b,prop.side,prop.slot),hp=change?change.before:c?.hp??72;
   prop.intact.visible=hp>0;prop.intact.rotation.z=hp>0?(1-hp/72)*.035:0;
   if(hp===0&&!prop.rubble){
    const rubble=new THREE.Group();prop.parent.add(rubble);const mat=new THREE.MeshStandardMaterial({color:this.map==='asgard'?'#756877':'#495b67',metalness:.35,roughness:.72});
    for(let i=0;i<15;i++){const size=.14+fraction(prop.slot+prop.side*7,i)*.22,m=new THREE.Mesh(new THREE.BoxGeometry(size,size*.5,size*.7),mat);m.position.set(prop.x+Math.sin(i*2.4)*(.2+i*.032),.035,prop.z+Math.cos(i*2.4)*(.2+i*.055));m.rotation.set(i*.4,i*.8,i*.3);m.castShadow=true;m.receiveShadow=true;rubble.add(m);}prop.rubble=rubble;
   }
   if(prop.rubble)prop.rubble.visible=hp===0;
  }
 }
 mark(e,b,point,index){
  if(e.dodge)return;const heavy=['hulk','groot'].includes(e.attacker),thunder=['thor','storm'].includes(e.attacker);
  if(!leavesMark(e))return;
  const seed=seedFor(e,index),radius=heavy?e.special?1.8:.8:thunder?1.15:.6;
  const mark=crack(this.marks,point,radius,seed);if(this.marks.children.length>14){const old=this.marks.children[0];old.removeFromParent();clear(old);}return mark;
 }
 impact(e,b,point){
  const index=b.events.indexOf(e);if(index<0||this.seen.has(index))return;this.seen.add(index);this.mark(e,b,point,index);this.syncCover(b);
  if(e.dodge||this.reduced)return;
  const heavy=['hulk','groot','thor','marvel'].includes(e.attacker),thunder=['thor','storm'].includes(e.attacker),broken=e.terrain?.some(c=>c.broken);
  if(!(heavy||e.crit||e.special||broken))return;
  const seed=seedFor(e,index),strength=broken?1.4:heavy&&e.special?1.3:e.crit?1:.6,root=new THREE.Group();root.position.copy(point);this.transient.add(root);
  const dustColor=this.map==='asgard'?'#b9a995':this.map==='wakanda'?'#88a996':'#9ba6b4',dust=[];
  const count=heavy||broken?15:7;
  for(let i=0;i<count;i++){
   const mat=new THREE.SpriteMaterial({map:this.glow,color:dustColor,transparent:true,opacity:0,depthWrite:false});const m=new THREE.Sprite(mat),angle=fraction(seed,i)*Math.PI*2,velocity=V(Math.cos(angle)*(1+fraction(seed,i+20)*2.5)*strength,.35+fraction(seed,i+30)*1.3,Math.sin(angle)*(1+fraction(seed,i+20)*2.5)*strength);root.add(m);dust.push({mesh:m,velocity,size:.4+fraction(seed,i+40)*.7});
  }
  const debris=[],mat=new THREE.MeshStandardMaterial({color:this.map==='asgard'?'#766a79':'#51606b',metalness:.3,roughness:.78,transparent:true});
  for(let i=0;i<(broken?18:heavy?10:4);i++){
   const m=new THREE.Mesh(new THREE.TetrahedronGeometry(.04+fraction(seed,i+60)*.11),mat),angle=fraction(seed,i+80)*Math.PI*2,velocity=V(Math.cos(angle)*(1+fraction(seed,i+90)*3)*strength,1.6+fraction(seed,i+100)*2.5,Math.sin(angle)*(1+fraction(seed,i+90)*3)*strength);root.add(m);debris.push({mesh:m,velocity,phase:i*.7});
  }
  let bolts=[];
  if(thunder){
   this.flash.color.set('#b6dfff');this.flashEnergy=e.special?5:2.2;
   for(let i=0;i<(e.special?3:1);i++){
    const points=[];for(let j=0;j<14;j++)points.push(V((fraction(seed,i*14+j)-.5)*.75,1+j*.65,(fraction(seed,i*14+j+500)-.5)*.5));
    const bolt=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#b9e9ff',transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending}));root.add(bolt);bolts.push(bolt);
   }
  }
  this.bursts.push({root,dust,debris,bolts,start:this.time,material:mat});
  while(this.bursts.length>4){const oldest=this.bursts.shift();oldest.root.removeFromParent();clear(oldest.root);}
 }
 update(dt,active){
  if(active){this.time+=dt;this.flashEnergy*=Math.exp(-dt*6);}this.flash.intensity=this.flashEnergy;
  this.bursts=this.bursts.filter(b=>{
   const t=this.time-b.start,q=clamp(t/1.45);
   for(const d of b.dust){d.mesh.position.copy(d.velocity).multiplyScalar(t);d.mesh.position.y=.08+d.velocity.y*t*.55;d.mesh.scale.setScalar(d.size*(1+t*1.8));d.mesh.material.opacity=Math.sin(Math.PI*q)*.18*(1-q*.6);}
   for(const d of b.debris){d.mesh.position.copy(d.velocity).multiplyScalar(t);d.mesh.position.y=Math.max(.04,d.velocity.y*t-t*t*3.8);d.mesh.rotation.set(t*4+d.phase,t*2+d.phase,t*3);}
   b.material.opacity=1-q;b.bolts.forEach((l,i)=>l.material.opacity=t<.4?(1-t/.4)*(.55+.45*Math.sin(t*75+i)**2):0);
   if(q>=1){b.root.removeFromParent();clear(b.root);return false;}return true;
  });
 }
 dispose(){this.reset();this.root.removeFromParent();this.flash.removeFromParent();}
}

export function signatureCharge(parent,{id,color,glow,reduced}){
 const root=new THREE.Group();parent.add(root);const magic=['wanda','strange','jean','magneto','loki','professor'].includes(id),thunder=['thor','storm'].includes(id),armor=['ironman','warmachine','vision','marvel','wasp'].includes(id),sprites=[];
 if(magic||thunder||armor)for(let i=0;i<(magic?2:1);i++){
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:id==='wanda'?'#f23a69':thunder?'#a9ddff':color,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));root.add(sprite);sprites.push(sprite);
 }
 const geometry=new THREE.BufferGeometry().setFromPoints(Array.from({length:24},()=>V())),lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:id==='wanda'?'#f64e7c':thunder?'#c3eaff':color,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));root.add(lines);
 return {update(p,actor,dir){
  const charge=Math.sin(Math.PI*clamp((p-.03)/.45));root.visible=!reduced&&p<.48;root.position.copy(actor.group.position).add(V(0,actor.rig.position.y+1.55*actor.scale,0));root.rotation.y=Math.atan2(dir.x,dir.z);
  sprites.forEach((m,i)=>{m.position.set(magic?(i?1:-1)*.38:0,magic?.12:.05,.45);m.scale.setScalar((magic?.75:1.1)*charge);m.material.opacity=charge*(id==='wanda'?.8:.55);});
  const a=geometry.attributes.position;for(let i=0;i<12;i++){const angle=i*Math.PI/6+p*5,r=.28+charge*.15,y=Math.sin(angle)*r;const side=magic?(i%2?1:-1)*.38:0;a.setXYZ(i*2,side+Math.cos(angle)*r,y,.42);a.setXYZ(i*2+1,side+Math.cos(angle+.24)*r*.65,y*.65,.5);}
  a.needsUpdate=true;geometry.computeBoundingSphere();lines.material.opacity=(magic||thunder||armor)?charge*.65:0;
 }};
}
