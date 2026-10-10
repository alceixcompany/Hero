import * as THREE from './vendor/three.module.js';

// Bevels catch the studio reflections, so props read as objects rather than plain cubes.
export function bevelBox(parent,w,h,d,material,x=0,y=0,z=0,bevel=.045){
 const b=Math.min(bevel,w*.2,h*.2,d*.2),shape=new THREE.Shape();
 shape.moveTo(-w/2+b,-h/2+b);shape.lineTo(w/2-b,-h/2+b);shape.lineTo(w/2-b,h/2-b);shape.lineTo(-w/2+b,h/2-b);shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:2,steps:1,curveSegments:1});geometry.translate(0,0,-d/2+b);
 const part=new THREE.Mesh(geometry,material);part.position.set(x,y,z);part.castShadow=true;part.receiveShadow=true;parent.add(part);return part;
}
const surface=(color,metalness=.6,roughness=.38)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const lightMaterial=color=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.6,metalness:.3,roughness:.3});
const box=(parent,w,h,d,mat,x=0,y=0,z=0)=>{
 const part=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);part.position.set(x,y,z);part.receiveShadow=true;parent.add(part);return part;
};
function floorTexture(map){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
 ctx.fillStyle=map==='asgard'?'#8b8492':map==='wakanda'?'#728d86':'#85929d';ctx.fillRect(0,0,256,256);
 // Repeatable fine grain and corner screws; no random state is consumed by scenery.
 for(let i=0;i<3500;i++){const x=(i*73)%256,y=(i*151+Math.floor(i/256)*31)%256;ctx.fillStyle=i%3?'#ffffff07':'#0000000b';ctx.fillRect(x,y,i%4+1,1);}
 if(map==='asgard'){ctx.lineWidth=2;for(let i=0;i<7;i++){ctx.strokeStyle=i%2?'#dfd6c21b':'#30313e12';ctx.beginPath();ctx.moveTo(-20,i*44);ctx.bezierCurveTo(100,i*44+75,100,i*44-60,280,i*44+24);ctx.stroke();}}else if(map==='wakanda'){ctx.strokeStyle='#b5e3ce17';ctx.lineWidth=1;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(30+i*48,0);ctx.lineTo(100+i*48,256);ctx.stroke();}}
 ctx.strokeStyle='#ffffff13';ctx.lineWidth=1;ctx.strokeRect(8,8,240,240);
 for(const x of [17,239])for(const y of [17,239]){ctx.fillStyle='#303b46';ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a9b3b5';ctx.beginPath();ctx.moveTo(x-1,y);ctx.lineTo(x+1,y);ctx.stroke();}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.userData.scenery=true;return texture;
}
export function architecturalScenery(env,map){
 const accent=map==='asgard'?'#edbe76':map==='wakanda'?'#73d6bc':'#9bbdd3';
 const body=surface(map==='asgard'?'#655d70':map==='wakanda'?'#274d4b':'#3c5062',.65,.36),dark=surface('#152530',.65,.5),edge=surface(map==='asgard'?'#b49365':'#668792',.8,.29),glow=lightMaterial(accent);
 const floor=new THREE.MeshStandardMaterial({color:map==='asgard'?'#777483':map==='wakanda'?'#4c7770':'#6e8092',map:floorTexture(map),metalness:.42,roughness:.56});
 const tileGeometry=new THREE.BoxGeometry(1.96,.025,1.46),tiles=new THREE.InstancedMesh(tileGeometry,floor,72),matrix=new THREE.Matrix4();let n=0;
 for(let x=-8;x<=8;x+=2)for(let z=-5.25;z<=5.25;z+=1.5){matrix.makeTranslation(x,-.048,z);tiles.setMatrixAt(n++,matrix);}tiles.receiveShadow=true;env.add(tiles);
 // Perimeter service panels never enter any of the six formation lanes.
 for(const x of [-9.15,9.15]){
  bevelBox(env,.38,.48,12.7,body,x,-.15,0);
  for(let z=-5.1;z<=5.1;z+=1.7){box(env,.015,.09,.65,glow,x+(x<0?.2:-.2),.02,z);box(env,.03,.16,.1,edge,x+(x<0?.2:-.2),-.12,z+.45);}
 }
 for(const side of [-1,1]){
  const plinth=new THREE.Group();plinth.position.set(side*8.35,0,-5.45);plinth.rotation.y=-side*.12;env.add(plinth);
  bevelBox(plinth,1.4,.23,1.25,dark,0,.025,0);bevelBox(plinth,1.18,.85,.94,body,0,.54,0);
  bevelBox(plinth,1.28,.1,1.04,edge,0,1.01,0,.025);box(plinth,.74,.055,.012,glow,0,.72,.48);
  for(let i=0;i<5;i++)box(plinth,.09,.38,.03,dark,-.39+i*.19,.42,.48);
  for(const x of [-.48,.48])box(plinth,.065,.7,.065,edge,x,.54,.48);
 }
 if(map==='city')cityEquipment(env,{body,dark,edge,glow});
 else if(map==='asgard')palaceDetails(env,{body,dark,edge,glow});
 else gardenDetails(env,{body,dark,edge,glow});
}
function cityEquipment(env,{body,dark,edge,glow}){
 // Roof ventilation, reinforced cargo and a communications gantry.
 for(const side of [-1,1]){
  const unit=new THREE.Group();unit.position.set(side*10.8,-.05,2.3);env.add(unit);
  bevelBox(unit,2.1,1.15,3.2,body,0,.5,0);bevelBox(unit,2.18,.15,3.28,edge,0,1.12,0);
  for(let i=0;i<11;i++)box(unit,1.75,.04,.075,dark,0,1.205,-1.3+i*.26);
  for(let i=0;i<6;i++)box(unit,.06,.7,.04,edge,-.75+i*.3,.56,1.63);
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,2.6,12),edge);pipe.rotation.x=Math.PI/2;pipe.position.set(.7,.25,2.5);unit.add(pipe);
  const cargo=new THREE.Group();cargo.position.set(side*11.1,0,-3);cargo.rotation.y=side*.23;env.add(cargo);
  for(let i=0;i<2;i++){
   bevelBox(cargo,1.8,.7,1.2,dark,0,.34+i*.73,0);bevelBox(cargo,1.9,.1,1.3,edge,0,.68+i*.73,0,.025);
   for(const x of [-.68,.68])box(cargo,.09,.55,.04,body,x,.34+i*.73,.63);
   box(cargo,.48,.12,.02,glow,0,.36+i*.73,.63);
  }
 }
 for(const x of [-10,10]){bevelBox(env,.32,5,.32,dark,x,2.4,-7);box(env,.07,4.5,.04,glow,x,2.4,-6.82);}
 bevelBox(env,20.4,.35,.6,body,0,4.85,-7);box(env,11,.045,.04,glow,0,4.63,-6.66);
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(3.5,.65),new THREE.MeshBasicMaterial({color:'#132c42'}));screen.position.set(0,4.82,-6.68);env.add(screen);
 for(let i=0;i<9;i++)box(env,.15,.18+(i%3)*.06,.025,glow,-1.25+i*.3,4.82,-6.65);
}
function palaceDetails(env,{body,dark,edge,glow}){
 const gold=surface('#bb975e',.82,.25);
 // A terraced entrance and slim, faceted colonnade frame the distant portal.
 for(let i=0;i<4;i++)bevelBox(env,17-i*1.2,.28,2.2-i*.25,body,0,-.28+i*.27,-8.3-i*.38);
 for(const side of [-1,1])for(let i=0;i<3;i++){
  const x=side*(8.8+i*2.5),z=-9.3-i*2;
  bevelBox(env,1.2,.28,1.2,dark,x,-.25,z);bevelBox(env,.85,.18,.85,gold,x,-.02,z);
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.25,.34,6+i*.7,8),body);pillar.position.set(x,3+i*.35,z);pillar.castShadow=true;env.add(pillar);
  for(const offset of [-.18,.18])box(env,.04,5.5+i*.7,.03,gold,x+offset,3+i*.35,z+.29);
  bevelBox(env,.95,.24,.95,gold,x,6+i*.7,z);bevelBox(env,.24,.55,.24,glow,x,6.5+i*.7,z);
 }
 for(const side of [-1,1]){
  const obelisk=new THREE.Group();obelisk.position.set(side*11.2,.1,3);env.add(obelisk);
  bevelBox(obelisk,1.7,.22,1.7,dark,0,0,0);bevelBox(obelisk,.9,2.1,.9,body,0,1.12,0);
  for(const x of [-.35,.35])box(obelisk,.05,1.65,.04,gold,x,1.15,.47);
  const crown=new THREE.Mesh(new THREE.OctahedronGeometry(.48),gold);crown.position.y=2.55;obelisk.add(crown);box(obelisk,.14,.55,.025,glow,0,1.2,.49);
 }
}
function gardenDetails(env,{body,dark,edge,glow}){
 const leaves=surface('#3e7155',.05,.83),stone=surface('#45645b',.15,.65);
 for(const side of [-1,1]){
  // A pavilion roof with an inset luminous seam and a landscaped terrace.
  const pavilion=new THREE.Group();pavilion.position.set(side*8.5,-.4,-9.2);pavilion.rotation.y=side*.24;env.add(pavilion);
  bevelBox(pavilion,4,.4,3.6,dark,0,0,0);bevelBox(pavilion,3.7,.1,3.3,body,0,.25,0);
  for(const x of [-1.5,1.5])for(const z of [-1.2,1.2])bevelBox(pavilion,.16,3.1,.16,edge,x,1.85,z,.025);
  bevelBox(pavilion,4.2,.28,3.8,body,0,3.45,0);box(pavilion,3.8,.055,.045,glow,0,3.36,1.91);
  for(let i=0;i<3;i++){
   const planter=new THREE.Group();planter.position.set(side*(10.6+i*.3),-.2,1+i*1.9);env.add(planter);
   bevelBox(planter,1.55,.45,1.35,stone,0,.12,0);box(planter,1.38,.025,1.18,dark,0,.36,0);
   for(let j=0;j<5;j++){
    const leaf=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),leaves);leaf.scale.set(.5,2.5,.4);leaf.position.set(Math.sin(j*2.4)*.4,.76,Math.cos(j*2.4)*.35);leaf.rotation.z=Math.sin(j*2.4)*.6;leaf.castShadow=true;planter.add(leaf);
   }
  }
  for(let i=0;i<3;i++)bevelBox(env,2.4,.17,1.5,stone,side*12,-.48+i*.14,4.5+i*1.35);
 }
}
