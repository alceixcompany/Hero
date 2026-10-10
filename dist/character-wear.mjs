import * as THREE from './vendor/three.module.js';
import {healthBehaviour} from './battle-presentation.mjs';
export function createBattleWear(actor,glow){
 const root=new THREE.Group(),base=actor.model?.object.children[0]??actor.rig;base.add(root);base.updateMatrixWorld(true);actor.model?.bones.get('spine_03')?.attach(root);
 const scars=[],sparks=[],armor=healthBehaviour(actor.id).armor;
 if(armor){
  for(let i=0;i<6;i++){
   const scar=new THREE.Mesh(new THREE.PlaneGeometry(.055+i%2*.035,.15),new THREE.MeshBasicMaterial({color:'#161922',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));scar.position.set((i%2?1:-1)*(.1+(i%3)*.055),1.25+(i%3)*.075,.15);scar.rotation.z=(i%2?1:-1)*.55;root.add(scar);scars.push(scar);
  }
  for(let i=0;i<5;i++){
   const geom=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(.08,.08,.025)]),line=new THREE.Line(geom,new THREE.LineBasicMaterial({color:'#ffe2a3',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));root.add(line);sparks.push(line);
  }
 }
 const glowSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:actor.id==='hulk'?'#7feb65':'#ffc263',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));glowSprite.position.set(0,1.42,.16);glowSprite.scale.setScalar(actor.id==='hulk'?.9:.35);root.add(glowSprite);
 let clock=0,damage=0;
 return {root,reset(){clock=0;damage=0;},update({dt,active,ratio,dead,reduced}){
  if(active)clock+=dt;
  const state=healthBehaviour(actor.id,ratio);if(!dead)damage=Math.max(damage,state.wear);
  scars.forEach((s,i)=>s.material.opacity=damage*(i<3?.6:.35));
  const pulse=(clock*1.35+actor.phase*.13)%1,burst=Math.max(0,1-pulse/.2);
  sparks.forEach((s,i)=>{s.visible=!dead&&!reduced&&state.wear>.15;s.position.set((i%2?1:-1)*.16+Math.sin(i*8)*pulse*.14,1.39+Math.cos(i*7)*pulse*.18,.19+pulse*.27);s.rotation.z=i*1.8+clock*.5;s.material.opacity=burst*state.wear;s.scale.setScalar(.5+pulse*2);});
  glowSprite.material.opacity=dead||reduced?0:actor.id==='hulk'?state.rage*(.12+.035*Math.sin(clock*3)):armor?state.wear*burst*.5:0;
  return state;
 },dispose(){root.removeFromParent();const geometries=new Set(),materials=new Set();root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)materials.add(n.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
