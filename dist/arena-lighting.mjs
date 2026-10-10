import * as THREE from './vendor/three.module.js';
// A small procedural studio supplies reflections without downloading an HDR map.
export function reflectionEnvironment(renderer){
 const room=new THREE.Scene();room.background=new THREE.Color('#172436');
 const panel=(x,y,z,w,h,color,rx=0,ry=0)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.set(rx,ry,0);room.add(m);};
 panel(0,8,0,14,8,'#fff0da',Math.PI/2);panel(-8,3,0,9,5,'#b8daf7',0,Math.PI/2);panel(8,4,-3,8,4,'#c48c66',0,Math.PI/2);panel(0,3,-8,15,2,'#8faac5');
 const pmrem=new THREE.PMREMGenerator(renderer),map=pmrem.fromScene(room,.025,.1,30);pmrem.dispose();room.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});return map;
}
export function contactTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#00000099');g.addColorStop(.45,'#00000055');g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(0,0,64,64);return new THREE.CanvasTexture(canvas);
}
export function contactShadow(parent,texture){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.8),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,opacity:.5}));m.rotation.x=-Math.PI/2;m.position.y=.025;m.renderOrder=1;parent.add(m);return m;
}
export function scenicDetails(env,map){
 const color=map==='asgard'?'#ffd69b':map==='wakanda'?'#6ef0c7':'#83cde7';
 const steel=new THREE.MeshStandardMaterial({color:map==='asgard'?'#75604d':'#253c4c',metalness:.7,roughness:.32});
 const glow=new THREE.MeshBasicMaterial({color});
 for(const x of [-8.9,8.9])for(const z of [-5.8,5.8]){
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(.17,.26,.45,12),steel);plinth.position.set(x,.14,z);env.add(plinth);
  const lens=new THREE.Mesh(new THREE.OctahedronGeometry(.17),glow);lens.position.set(x,.46,z);env.add(lens);
  const light=new THREE.PointLight(color,1.8,4,2);light.position.set(x,.65,z);env.add(light);
 }
 // Fine inset markings break up the broad floor and keep the combat lanes clear.
 const marking=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.22});
 for(const side of [-1,1])for(let i=0;i<8;i++){
  const tick=new THREE.Mesh(new THREE.BoxGeometry(.28,.006,.045),marking);tick.position.set(side*7.5,-.039,-4.8+i*.28);env.add(tick);
 }
 if(map==='city'){
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.045,.08,3.8,8),steel);mast.position.set(-9.8,1.5,-5.7);env.add(mast);
  const dish=new THREE.Mesh(new THREE.SphereGeometry(.65,16,8,0,Math.PI*2,0,Math.PI/2),steel);dish.position.set(-9.8,3.3,-5.7);dish.rotation.z=.6;env.add(dish);
 }
 if(map==='wakanda')for(const side of [-1,1]){
  const pool=new THREE.Mesh(new THREE.CircleGeometry(3,40),new THREE.MeshPhysicalMaterial({color:'#1d5357',metalness:.3,roughness:.13,clearcoat:1,transparent:true,opacity:.8}));pool.rotation.x=-Math.PI/2;pool.position.set(side*14,-.68,-7);env.add(pool);
 }
}
