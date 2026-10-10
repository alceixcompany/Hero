import {healthBehaviour,sequenceClip} from './battle-presentation.mjs';
import {signatureFor,signaturePose} from './hero-signatures.mjs';
import {meleeClip} from './combat-choreography.mjs';
import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {clone} from './vendor/addons/utils/SkeletonUtils.js';
import {profileFor} from './character-profiles.mjs';

const folder='/assets/characters/', loader=new GLTFLoader(), cache=new Map();
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const color=hex=>new THREE.Color(hex);
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const mat=(hex,metal=0,glow=0)=>new THREE.MeshStandardMaterial({color:hex,metalness:metal,roughness:metal?.33:.68,emissive:hex,emissiveIntensity:glow});
const asset=name=>{if(!cache.has(name))cache.set(name,loader.loadAsync(folder+name+'.glb').catch(e=>{cache.delete(name);throw e;}));return cache.get(name);};
function solid(parent,geo,material,position=[0,0,0],rotation=[0,0,0]){const o=new THREE.Mesh(geo,material);o.position.fromArray(position);o.rotation.set(...rotation);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
const box=(p,size,m,at,rot)=>solid(p,new THREE.BoxGeometry(...size),m,at,rot);
const ball=(p,size,m,at)=>{const o=solid(p,new THREE.SphereGeometry(1,20,14),m,at);o.scale.fromArray(size);return o;};
const tube=(p,r,length,m,at,rot)=>solid(p,new THREE.CylinderGeometry(r,r,length,12),m,at,rot);
function path(p,points,r,m){return solid(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(a=>V(...a))),24,r,6,false),m);}
function plate(p,points,material,at=[0,0,0]){const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return solid(p,new THREE.ExtrudeGeometry(shape,{depth:.016,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:1,steps:1}),material,at);}
const starPoints=(r=.085,arms=5)=>Array.from({length:arms*2},(_,i)=>{const a=Math.PI/2+i*Math.PI/arms;return [Math.cos(a)*r*(i%2?.42:1),Math.sin(a)*r*(i%2?.42:1)];});

function paintBody(mesh,p,id){
 const geometry=mesh.geometry.clone(),positions=geometry.getAttribute('position'),colors=new Float32Array(positions.count*3);
 const suit=color(p.suit),trim=color(p.trim),skin=color(p.skin),dark=color('#151c28');
 const name=mesh.name.toLowerCase(),isEyes=name==='eyes',isBrow=name==='eyebrows';
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),ax=Math.abs(x);
  const head=y>1.57&&ax<.18,hands=ax>.73,boots=y<.25,gloves=ax>.61&&y>1.05;
  let c=suit;
  if(isEyes)c=['armor','wararmor','spider','panther','vision','ant','wasp'].includes(p.gear)?color('#c5edff'):color('#dde4df');
  else if(isBrow)c=p.hair?.includes('blond')?color('#99763b'):dark;
  else if(id==='hulk')c=y<.77&&y>.37?trim:skin;
  else if(id==='groot')c=color((Math.floor(x*48+z*31)%4===0)?'#463a28':'#88694a');
  else if(id==='rocket')c=head||hands?skin:y<.85?dark:suit;
  else if(head)c=p.skin;
  else if(hands)c=['agent','hammer','sorcerer','horns','bow','bionic','skull'].includes(p.gear)?skin:trim;
  else if(boots||gloves)c=['spider','claws','visor','star','phoenix','vision'].includes(p.gear)?trim:dark;
  else if(y>.91&&y<.99)c=trim;
  else if(['armor','wararmor','ant'].includes(p.gear)&&((y>1.33&&ax>.23)||(y>1.08&&y<1.2)||(y<.85&&y>.77)))c=trim;
  else if(id==='spiderman'&&y<1.1&&ax<.52)c=trim;
  else if(id==='captain'&&y>1.04&&y<1.22&&z>0)c=Math.floor(x*28)%2===0?color('#d4d9d3'):trim;
  else if(id==='winter'&&x>.26&&y>1.08)c=trim;
  else if(id==='wolverine'&&y>1.13&&y<1.45&&ax<.27)c=suit;
  c=typeof c==='string'?color(c):c;
  // A modest fabric/bark variation retains the sculpted surface at arena scale.
  const shade=id==='groot'?1:.94+.06*Math.sin(y*28+x*17);
  colors[i*3]=c.r*shade;colors[i*3+1]=c.g*shade;colors[i*3+2]=c.b*shade;
 }
 geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));mesh.geometry=geometry;
 mesh.material=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,metalness:['armor','wararmor','ant'].includes(p.gear)?.68:.06,roughness:['armor','wararmor'].includes(p.gear)?.32:.65});
 mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
 if(isBrow&&!p.hair&&p.gear!=='chair')mesh.visible=false;
}

// Equipment is authored in the imported bind pose, then attached to the real bones.
// Headgear, weapons, boots and capes therefore follow all baked animation clips.
function dress(model,p,id,bones){
 const suit=mat(p.suit,.22),trim=mat(p.trim,.65),dark=mat('#151c27'),silver=mat('#c7d7df',.92),light=mat('#b6efff',.5,2),skin=mat(p.skin),gold=mat('#d8b350',.78);
 model.updateMatrixWorld(true);
 const attach=(bone,at,build)=>{const g=new THREE.Group();g.position.fromArray(at);model.add(g);build(g);model.updateMatrixWorld(true);bones.get(bone).attach(g);return g;};
 const head=(build)=>attach('Head',[0,1.69,0],build);
 const chest=(build)=>attach('spine_03',[0,1.39,0],build);
 const hand=(side,build)=>attach('hand_'+side,[side==='r'?-.82:.82,1.38,0],build);
 const maskEyes=g=>{for(const s of [-1,1]){const e=ball(g,[.037,.013,.012],light,[s*.048,.02,.105]);e.rotation.z=s*-.17;}};
 const cape=(hex,width=.85,length=1.05)=>{
  const g=new THREE.PlaneGeometry(width,length,8,12),pos=g.attributes.position;
  for(let i=0;i<pos.count;i++){const y=pos.getY(i);pos.setX(i,pos.getX(i)*(.7+(length/2-y)*.55));pos.setZ(i,-.04-Math.cos(pos.getX(i)*20)*.018);}
  g.computeVertexNormals();return chest(c=>solid(c,g,new THREE.MeshStandardMaterial({color:hex,side:THREE.DoubleSide,roughness:.8}),[0,-length/2+.05,-.15]));
 };
 const sword=(h,length=.72)=>{tube(h,.025,.18,dark,[0,-.075,.025]);box(h,[.18,.025,.07],gold,[0,-.17,.025]);plate(h,[[-.028,0],[.028,0],[.022,-length],[0,-length-.1],[-.022,-length]],silver,[0,-.19,.03]);};
 let cloak=null;const jets=[],wings=[];
 if(['armor','wararmor','ant','wasp'].includes(p.gear)){
  head(g=>{ball(g,[.111,.135,.108],suit,[0,0,0]);plate(g,[[-.075,.085],[.075,.085],[.082,-.03],[.05,-.095],[-.05,-.095],[-.082,-.03]],trim,[0,0,.097]);maskEyes(g);box(g,[.05,.012,.024],dark,[0,-.066,.117]);if(['ant','wasp'].includes(p.gear))for(const s of [-1,1])tube(g,.007,.13,silver,[s*.06,.153,-.02],[0,0,s*-.3]);});
  chest(g=>{box(g,[.38,.24,.055],suit,[0,-.01,.08]);ball(g,[.055,.055,.015],light,[0,.015,.132]);for(const s of [-1,1])box(g,[.14,.06,.07],trim,[s*.13,-.12,.06],[0,0,s*-.2]);});
  for(const s of ['l','r']){const x=s==='r'?-.62:.62;attach('upperarm_'+s,[x,1.39,0],g=>ball(g,[.15,.11,.14],suit,[0,0,0]));const jet=attach('foot_'+s,[s==='r'?-.11:.11,.04,0],g=>{const flame=solid(g,new THREE.ConeGeometry(.055,.35,12),new THREE.MeshBasicMaterial({color:'#8bedff',transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false}),[0,-.12,0],[0,0,Math.PI]);jets.push(flame);});}
  if(p.gear==='wararmor')chest(g=>{box(g,[.14,.17,.42],dark,[-.23,.14,-.03]);tube(g,.043,.36,silver,[-.23,.13,.19],[Math.PI/2,0,0]);});
 }
 if(['spider','panther','katanas','claws','devil','shield','magnet','vision'].includes(p.gear))head(g=>{
  if(p.gear!=='shield'&&p.gear!=='magnet')ball(g,[.103,.126,.102],suit,[0,0,0]);
  if(p.gear==='spider'||p.gear==='katanas'){for(const s of [-1,1]){const eye=ball(g,[.043,.033,.014],dark,[s*.045,.021,.094]);eye.rotation.z=-s*.3;ball(eye,[.83,.78,.75],light,[0,0,.25]);}}
  if(p.gear==='panther'){maskEyes(g);for(const s of [-1,1])solid(g,new THREE.ConeGeometry(.035,.1,4),suit,[s*.08,.131,0]);}
  if(p.gear==='claws'){for(const s of [-1,1])plate(g,[[0,-.07],[s*.028,.15],[s*.09,.105],[s*.08,-.06]],dark,[s*.035,.005,.088]);maskEyes(g);ball(g,[.066,.04,.025],skin,[0,-.069,.085]);}
  if(p.gear==='devil'){for(const s of [-1,1])solid(g,new THREE.ConeGeometry(.016,.065,12),suit,[s*.061,.118,.035]);ball(g,[.052,.025,.024],skin,[0,-.08,.076]);}
  if(p.gear==='magnet'){ball(g,[.122,.144,.125],suit,[0,0,0]);plate(g,[[-.08,.08],[-.058,-.1],[-.035,-.1],[-.052,.045],[.052,.045],[.035,-.1],[.058,-.1],[.08,.08]],trim,[0,0,.121]);ball(g,[.065,.074,.01],skin,[0,-.025,.127]);}
  if(p.gear==='shield'){ball(g,[.11,.129,.107],suit,[0,.005,0]);ball(g,[.056,.039,.013],skin,[0,-.069,.09]);plate(g,[[-.028,0],[0,.067],[.028,0],[.018,0],[.012,.02],[-.012,.02],[-.018,0]],mat('#eeeeea'),[0,.016,.102]);}
  if(p.gear==='vision'){plate(g,[[-.018,0],[0,.034],[.018,0],[0,-.034]],gold,[0,.043,.102]);maskEyes(g);}
 });
 if(p.gear==='hammer'){
  cloak=cape('#aa2c38',.97,1.19);
  chest(g=>{for(const s of [-1,1])for(let i=0;i<3;i++)ball(g,[.06,.06,.026],silver,[s*.115,.05-i*.11,.102]);});
  hand('r',g=>{tube(g,.026,.39,dark,[0,-.17,0]);box(g,[.29,.2,.19],silver,[0,-.45,0]);box(g,[.23,.027,.15],trim,[0,-.56,0]);});
 }
 if(p.gear==='shield'){
  chest(g=>plate(g,starPoints(.085),mat('#e9eeea'),[0,.015,.107]));
  hand('l',g=>{for(const [r,hex,z] of [[.24,'#bd3143',.045],[.2,'#e7ece8',.065],[.15,'#bd3143',.077],[.098,'#275ca0',.088]])solid(g,new THREE.CylinderGeometry(r,r,.016,40),mat(hex,.62),[0,-.1,z],[Math.PI/2,0,0]);plate(g,starPoints(.067),mat('#edf3ec'),[0,-.1,.102]);});
 }
 if(['sorcerer','horns','witch','storm','magnet','vision'].includes(p.gear)){
  cloak=cape(p.gear==='storm'?'#c3cfdf':p.gear==='vision'?'#d4b957':p.gear==='horns'?'#1d493a':p.gear==='magnet'?'#6e4890':'#8e2738',p.gear==='storm'?1.4:.9,1.04);
  if(p.gear==='sorcerer'){chest(g=>{ball(g,[.058,.058,.025],gold,[0,.07,.11]);plate(g,[[-.15,0],[-.18,.26],[-.11,.16],[0,0]],mat('#af2d39'),[-.04,.08,-.04]);plate(g,[[.15,0],[.18,.26],[.11,.16],[0,0]],mat('#af2d39'),[.04,.08,-.04]);});}
  if(p.gear==='witch')head(g=>plate(g,[[-.092,.025],[-.078,.105],[-.052,.079],[0,.113],[.052,.079],[.078,.105],[.092,.025],[.05,.048],[0,.07],[-.05,.048]],mat('#a72d4d',.65),[0,.02,.108]));
  if(p.gear==='horns')head(g=>{box(g,[.17,.035,.042],gold,[0,.08,.09]);for(const s of [-1,1])path(g,[[s*.07,.085,.055],[s*.13,.17,.055],[s*.13,.31,.02],[s*.07,.41,-.01]],.018,gold);});
  if(p.gear==='storm')head(g=>{box(g,[.17,.025,.025],gold,[0,.085,.096]);plate(g,[[0,0],[.023,.045],[0,.07],[-.023,.045]],gold,[0,.07,.1]);});
 }
 if(p.gear==='claws')for(const s of ['l','r'])hand(s,g=>{for(const x of [-.035,0,.035])box(g,[.013,.32,.021],silver,[x,-.19,.048],[.12,0,0]);});
 if(['katanas','sword'].includes(p.gear)){hand('r',g=>sword(g));if(p.gear==='katanas')chest(g=>{for(const s of [-1,1])box(g,[.045,.8,.05],dark,[s*.09,-.1,-.13],[0,0,s*.33]);});}
 if(p.gear==='bow'){
  hand('l',g=>{path(g,[[0,-.43,.06],[.045,-.2,.02],[.09,0,0],[.045,.2,.02],[0,.43,.06]],.015,trim);path(g,[[0,-.43,.06],[-.015,0,.08],[0,.43,.06]],.0025,silver);});
  chest(g=>{box(g,[.09,.55,.09],dark,[.15,-.1,-.16],[0,0,-.13]);for(let i=0;i<4;i++)tube(g,.004,.65,silver,[.14+i*.018,.02,-.16],[0,0,-.13]);});
 }
 if(p.gear==='agent'||p.gear==='skull'){hand('r',g=>{box(g,[.04,.07,.08],dark,[0,-.05,.035]);box(g,[.044,.04,.18],silver,[0,-.035,.1]);});chest(g=>{for(const s of [-1,1])box(g,[.055,.29,.023],dark,[s*.14,-.08,.1]);});}
 if(p.gear==='skull')chest(g=>{plate(g,[[-.075,.04],[-.055,.085],[.055,.085],[.075,.04],[.05,-.025],[.04,-.08],[-.04,-.08],[-.05,-.025]],mat('#ecebe0'),[0,.01,.109]);for(const s of [-1,1])ball(g,[.025,.017,.007],dark,[s*.031,.031,.139]);for(const x of [-.023,0,.023])box(g,[.009,.05,.012],dark,[x,-.052,.132]);});
 if(p.gear==='visor')head(g=>{box(g,[.18,.051,.035],gold,[0,.03,.089]);box(g,[.145,.019,.015],mat('#ff383f',.2,2),[0,.03,.116]);});
 if(p.gear==='star'||p.gear==='phoenix')chest(g=>{plate(g,starPoints(.115,p.gear==='star'?8:5),gold,[0,0,.108]);if(p.gear==='star')for(const s of [-1,1])box(g,[.2,.04,.035],gold,[s*.14,.08,.075],[0,0,s*.2]);});
 if(p.gear==='spider')chest(g=>{ball(g,[.017,.04,.012],dark,[0,.018,.114]);for(const s of [-1,1])for(let i=0;i<4;i++)path(g,[[0,.025,.116],[s*.048,.05-i*.025,.119],[s*.07,.07-i*.043,.109]],.004,dark);});
 if(p.gear==='panther')chest(g=>{for(let i=0;i<9;i++)solid(g,new THREE.ConeGeometry(.018,.055,4),silver,[(i-4)*.027,.09-Math.sin(i/8*Math.PI)*.09,.113],[0,0,Math.PI]);});
 if(p.gear==='bionic')attach('upperarm_l',[.48,1.38,0],g=>{for(let i=0;i<5;i++)box(g,[.04,.11,.145],silver,[i*.04-.06,0,0]);plate(g,starPoints(.045),mat('#b82f3e'),[0,0,.09]);});
 if(p.gear==='falcon'||p.gear==='wasp'){
  for(const s of [-1,1])wings.push(chest(g=>{
   if(p.gear==='falcon')for(let i=0;i<6;i++)plate(g,[[0,0],[s*(.35+i*.12),.09-i*.04],[s*(.3+i*.12),-.3-i*.02],[0,-.1]],i%2?trim:silver,[s*.14,.01,-.19-i*.002]);
   else{const m=new THREE.MeshPhysicalMaterial({color:'#b3deef',transparent:true,opacity:.42,roughness:.2,side:THREE.DoubleSide,metalness:.2});ball(g,[.31,.48,.014],m,[s*.37,.22,-.17]);ball(g,[.23,.28,.014],m,[s*.29,-.23,-.17]);}
  }));
  if(p.gear==='falcon')head(g=>{box(g,[.155,.042,.021],dark,[0,.017,.083]);box(g,[.13,.016,.014],mat('#eb6962',.2,.6),[0,.017,.102]);});
 }
 if(p.gear==='hulk')head(g=>{box(g,[.12,.029,.046],skin,[0,-.045,.085]);box(g,[.079,.014,.01],mat('#e2e4c9'),[0,-.036,.111]);});
 if(p.gear==='raccoon'){
  head(g=>{ball(g,[.15,.13,.115],mat('#896b4c'),[0,.01,0]);for(const s of [-1,1]){ball(g,[.045,.066,.02],dark,[s*.11,.135,0]);ball(g,[.06,.033,.02],dark,[s*.061,.032,.09]);ball(g,[.012,.013,.012],light,[s*.058,.038,.112]);}ball(g,[.072,.045,.055],mat('#c6aa82'),[0,-.045,.12]);ball(g,[.025,.018,.02],dark,[0,-.035,.166]);});
  attach('pelvis',[0,.96,0],g=>{path(g,[[0,-.03,-.12],[0,-.22,-.3],[.16,-.35,-.42],[.29,-.25,-.4]],.06,mat('#785939'));for(let i=0;i<3;i++)ball(g,[.07,.067,.07],dark,[i*.07,-.27-i*.015,-.34-i*.022]);});
  hand('r',g=>{box(g,[.12,.14,.48],dark,[0,-.09,.13]);tube(g,.038,.22,silver,[0,-.09,.42],[Math.PI/2,0,0]);});
 }
 if(p.gear==='tree'){
  head(g=>{for(const s of [-1,1]){path(g,[[s*.04,.07,-.03],[s*.07,.19,-.03],[s*.055,.32,-.02]],.023,suit);path(g,[[s*.07,.16,-.03],[s*.13,.22,-.04]],.014,suit);}for(const s of [-1,1])ball(g,[.024,.02,.014],dark,[s*.043,.014,.08]);box(g,[.05,.006,.015],dark,[0,-.044,.094]);});
  chest(g=>{for(let i=0;i<7;i++)path(g,[[(i-3)*.044,.12,.094],[(i-3)*.038,-.05,.14],[(i-3)*.04,-.31,.115]],.011,i%2?suit:dark);});
 }
 if(p.gear==='chair'){
  const chair=new THREE.Group();model.add(chair);box(chair,[.53,.055,.46],dark,[0,.47,0]);box(chair,[.51,.48,.05],suit,[0,.7,-.2]);
  for(const s of [-1,1]){box(chair,[.045,.04,.39],silver,[s*.29,.61,0]);const wheel=solid(chair,new THREE.TorusGeometry(.285,.027,8,32),silver,[s*.33,.285,0],[0,Math.PI/2,0]);for(let i=0;i<8;i++){const angle=i*Math.PI/4;path(chair,[[s*.33,.285,0],[s*.33,.285+Math.sin(angle)*.265,Math.cos(angle)*.265]],.004,silver);}}
 }
 return {cloak,jets,wings};
}

function adaptClips(library,model){
 const target=new Map(),source=new Map();model.traverse(n=>{if(n.isBone)target.set(n.name,n.position.clone());});library.scene.traverse(n=>{if(n.isBone)source.set(n.name,n.position.clone());});
 return library.animations.map(clip=>{
  const tracks=clip.tracks.filter(t=>t.name.endsWith('.quaternion')||t.name==='root.position'||t.name==='pelvis.position').map(track=>{
   const t=track.clone();if(t.name==='root.position'){const rest=model.getObjectByName('root').position;for(let i=0;i<t.values.length;i+=3){t.values[i]=rest.x;t.values[i+2]=rest.z;}}if(t.name==='pelvis.position'){
    const to=target.get('pelvis'),from=source.get('pelvis');for(let i=0;i<t.values.length;i+=3)for(let axis=0;axis<3;axis++)t.values[i+axis]+=to.getComponent(axis)-from.getComponent(axis);
   }return t;
  });return new THREE.AnimationClip(clip.name,clip.duration,tracks);
 });
}

export async function loadCharacter(id,{getAsset=asset}={}){
 const p=profileFor(id),signature=signatureFor(id);if(!p)throw Error('Unknown character '+id);
 const [base,library,hair]=await Promise.all([getAsset(p.base),getAsset('combat'),p.hair?getAsset('Hair_'+(p.hair.startsWith('long')?'Long':p.hair.startsWith('buzz')?'Buzzed':'SimpleParted')):null]);
 const model=clone(base.scene),bones=new Map();model.traverse(n=>{if(n.isBone)bones.set(n.name,n);if(n.isSkinnedMesh)paintBody(n,p,id);});
 const attachments=dress(model,p,id,bones);const wingRest=attachments.wings.map(w=>w.quaternion.clone());let cloakMesh;attachments.cloak?.traverse(n=>{if(n.isMesh)cloakMesh=n;});const cloakRest=cloakMesh?.geometry.attributes.position.array.slice();
 if(hair){
  const h=hair.scene.clone(true),hex=p.hair.endsWith('blond')?'#ceaa5a':p.hair.endsWith('white')?'#e0e6ec':p.hair.endsWith('auburn')?'#a14533':p.hair.endsWith('purple')?'#772c68':'#25212c';
  h.traverse(n=>{if(n.isMesh){n.geometry.userData.shared=true;n.material=mat(hex);n.castShadow=true;n.receiveShadow=true;}});
  model.add(h);model.updateMatrixWorld(true);bones.get('Head').attach(h);
  if(id==='thor'||id==='strange'){
   const beard=await getAsset('Hair_Beard'),b=beard.scene.clone(true);b.traverse(n=>{if(n.isMesh){n.geometry.userData.shared=true;n.material=mat(hex);n.castShadow=true;}});model.add(b);model.updateMatrixWorld(true);bones.get('Head').attach(b);
  }
 }
 const visual=new THREE.Group();visual.add(model);visual.scale.set(p.width*2.4/1.81,2.4/1.81,2.4/1.81);
 const clips=adaptClips(library,model),mixer=new THREE.AnimationMixer(model),actions=new Map();
 if(p.gear==='chair'){
  const sitting=clips.find(c=>c.name==='Sitting_Idle_Loop');
  const lower=t=>/^(root|pelvis|thigh|calf|foot|ball|toe)/.test(t.name);
  for(const spell of clips.filter(c=>['Spell_Simple_Shoot','Hit_Chest'].includes(c.name))){spell.tracks=spell.tracks.filter(t=>!lower(t));
  for(const track of sitting.tracks.filter(lower)){
   const held=track.clone(),n=track.getValueSize();held.times=new Float32Array([0,spell.duration]);held.values=new Float32Array([...track.values.slice(0,n),...track.values.slice(0,n)]);spell.tracks.push(held);
  }}
 }
 for(const clip of clips){const action=mixer.clipAction(clip);action.play();action.weight=0;action.enabled=true;actions.set(clip.name,action);}
 let idle=0,walkTime=0,current=null,exchange=null,deathTime=0,eliminated=false,overlays=[];
 function restoreOverlays(){for(const {bone,quaternion} of overlays.reverse())bone.quaternion.copy(quaternion);overlays=[];}
 function pose(name,t,dt){
  if(!actions.has(name))name='Idle_Loop';const transition=1-Math.exp(-dt*18);
  // A corpse has one authoritative pose; idle/hit weights cannot lift it again.
  for(const [key,action] of actions){action.weight=name==='Death01'?(key===name?1:0):THREE.MathUtils.lerp(action.weight,key===name?1:0,current?transition:1);if(key===name)action.time=Math.max(0,Math.min(action.getClip().duration-.001,t));}
  current=name;mixer.update(0);
 }
 pose(p.gear==='chair'?'Sitting_Idle_Loop':'Idle_Loop',0,0);
 return {object:visual,profile:p,bones,clipNames:clips.map(c=>c.name),...attachments,
  reset(){restoreOverlays();eliminated=false;deathTime=0;exchange=null;idle=0;walkTime=0;current=null;pose(p.gear==='chair'?'Sitting_Idle_Loop':'Idle_Loop',0,0);},
  update({dt,playing=true,moving=0,flight=false,event=null,role=null,progress=1,dead=false,reduced=false,traveling=false,encounter=null,victory=false,victoryProgress=0,health=1}){
   restoreOverlays();eliminated||=dead;if(playing&&!eliminated){idle+=dt;walkTime+=dt*signature.cadence*(id==='hulk'?1+healthBehaviour(id,health).rage*.2:1-healthBehaviour(id,health).fatigue*.18)*clamp(moving/.85,.08,1.4);}let name=p.gear==='chair'?'Sitting_Idle_Loop':moving>.08&&!flight?'Walk_Loop':'Idle_Loop',t=(name==='Walk_Loop'?walkTime:idle)%(actions.get(name)?.getClip().duration??2.5);
   if(eliminated){deathTime+=playing||progress>=1?dt:0;name='Death01';t=Math.min(deathTime,actions.get(name).getClip().duration-.001);}
   else if(event&&role&&progress<1){
    if(exchange!==event){exchange=event;deathTime=0;}
    if(role==='attacker'){name=p.gear==='chair'?'Spell_Simple_Shoot':event.special&&['sorcerer','witch','storm','magnet','vision','horns','phoenix'].includes(p.gear)?'Spell_Simple_Shoot':p.attack;if(['Punch_Jab','Punch_Cross'].includes(name)&&event.round%2===0)name=name==='Punch_Jab'?'Punch_Cross':'Punch_Jab';t=progress*actions.get(name).getClip().duration;if(encounter==='brawl'||encounter==='blade'){const clip=meleeClip(progress,encounter,id);name=clip.name;t=clip.phase*actions.get(name).getClip().duration;}if(traveling&&progress>.15&&progress<.28&&!flight){name='Jog_Fwd_Loop';t=progress*4*signature.cadence%actions.get(name).getClip().duration;}}
    else if(progress>.48){name=event.dodge&&p.gear!=='chair'?'Roll':'Hit_Chest';t=clamp((progress-.48)/.52)*actions.get(name).getClip().duration;}else if(['brawl','blade'].includes(encounter)&&progress>.28){name=p.gear==='chair'?'Sitting_Idle_Loop':'Punch_Jab';t=clamp((progress-.28)/.2)*.22;}
   }
   let defending=false;
   if(!eliminated&&event?.type==='charge'&&role==='attacker'){name=p.gear==='hammer'?'Sword_Attack':'Spell_Simple_Idle_Loop';t=.12*actions.get(name).getClip().duration;}
   else if(!eliminated&&event?.sequence&&role&&progress<1){const clip=sequenceClip(progress,role,id,event.dodge);name=p.gear==='chair'?'Sitting_Idle_Loop':clip.name;t=clip.phase*actions.get(name).getClip().duration;defending=clip.block;}
   if(victory&&!eliminated){name=p.gear==='chair'?'Sitting_Idle_Loop':['sorcerer','witch','phoenix','magnet','horns'].includes(p.gear)?'Spell_Simple_Idle_Loop':'Idle_Loop';t=idle%actions.get(name).getClip().duration;}
   pose(name,t,dt);
   if(!eliminated&&!victory){for(const [key,axis,angle] of signaturePose(id,{time:idle,moving,flight,role,progress:event?.type==='charge'?.2:progress,special:event?.special||event?.type==='charge',reduced,health})){const bone=bones.get(key);if(bone){overlays.push({bone,quaternion:bone.quaternion.clone()});if(axis==='x')bone.rotateX(angle);else if(axis==='y')bone.rotateY(angle);else bone.rotateZ(angle);}}}
   if(defending&&!eliminated){for(const key of ['upperarm_l','upperarm_r','lowerarm_l','lowerarm_r']){const bone=bones.get(key);if(bone){overlays.push({bone,quaternion:bone.quaternion.clone()});bone.rotateX(key.startsWith('lower')?-.9:-.65);}}}
   if(!eliminated&&!event?.sequence&&role==='target'&&['brawl','blade'].includes(encounter)&&progress>.25&&progress<.48){const weight=Math.sin(clamp((progress-.25)/.23)*Math.PI);for(const key of ['upperarm_l','upperarm_r','lowerarm_l','lowerarm_r']){const bone=bones.get(key);if(bone){overlays.push({bone,quaternion:bone.quaternion.clone()});bone.rotateX(-weight*(key.startsWith('lower')?.8:.5));}}}
   if(victory&&!eliminated){const amount=clamp(victoryProgress),magic=['sorcerer','witch','phoenix','magnet','horns','chair'].includes(p.gear);const left=p.gear==='shield',double=magic||['hulk','claws','tree'].includes(p.gear),arm=magic?-.6:['sword','katanas'].includes(p.gear)?-.8:-1.25;const stance=[[left?'upperarm_l':'upperarm_r',arm],[left?'lowerarm_l':'lowerarm_r',-.35],['spine_03',-.09],['Head',-.05]];if(double)stance.push(['upperarm_l',arm],['lowerarm_l',-.35]);for(const [key,angle] of stance){const bone=bones.get(key);if(bone){overlays.push({bone,quaternion:bone.quaternion.clone()});bone.rotateX(angle*amount);}}}
   if(flight&&!eliminated&&!(event&&role&&progress<1)&&p.gear!=='chair'){
    for(const [name,angle] of [['spine_03',.09],['thigh_l',.15],['thigh_r',.22],['calf_l',.22],['calf_r',.29]]){const bone=bones.get(name);overlays.push({bone,quaternion:bone.quaternion.clone()});bone.rotateX(angle);}
   }
   if(!reduced){
    if(cloakMesh){const attr=cloakMesh.geometry.attributes.position;for(let i=0;i<attr.count;i++){const y=cloakRest[i*3+1],amount=Math.max(0,.5-y);attr.setZ(i,cloakRest[i*3+2]+Math.sin(idle*3.2+cloakRest[i*3]*9-y*4)*.035*amount*(flight?1.7:1));}attr.needsUpdate=true;}
    this.wings.forEach((wing,i)=>{wing.quaternion.copy(wingRest[i]);if(!eliminated)wing.rotateZ((i?1:-1)*Math.sin(idle*(id==='wasp'?24:3.2))*(id==='wasp'?.1:.035));});
   }

   this.jets.forEach(j=>{j.visible=flight&&!eliminated;j.scale.y=.9+Math.sin(idle*23)*.12;});
  },
  dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);const geometry=new Set(),materials=new Set(),skeletons=new Set();model.traverse(n=>{if(n.isMesh){if(!n.geometry.userData.shared)geometry.add(n.geometry);if(n.isSkinnedMesh)skeletons.add(n.skeleton);if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>materials.add(m));}});geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());skeletons.forEach(s=>s.dispose());}
 };
}
