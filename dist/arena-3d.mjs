import * as THREE from './vendor/three.module.js';
import {hero} from './engine.mjs?v=2';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const SUITS={
 ironman:['#9b2529','#d5ab52','armor'],spiderman:['#b42336','#173c70','mask'],thor:['#414b59','#a2b6c0','cape'],hulk:['#638a40','#49386d','big'],strange:['#233c57','#b73630','cape'],panther:['#141b29','#a7adb7','mask'],wanda:['#782438','#cf5c63','crown'],captain:['#244d79','#b62f38','mask'],widow:['#1c232a','#aa352a','hair'],loki:['#254b34','#ba9a46','horns'],marvel:['#253c60','#c49736','hair'],hawkeye:['#30243f','#9260a8','hair'],wolverine:['#d1a934','#274b82','mask'],deadpool:['#9a2833','#1a1b22','mask'],storm:['#242735','#d5d9e4','cape'],cyclops:['#223f70','#d5b245','visor'],jean:['#264837','#d5ab3e','hair'],magneto:['#8a293b','#71568f','cape'],professor:['#344440','#d2b290','chair'],daredevil:['#8a2330','#c26a59','mask'],punisher:['#262d33','#d7d9ce','hair'],antman:['#852a31','#a6b4bd','armor'],wasp:['#252d34','#d4ab45','wings'],vision:['#536e52','#ddba57','cape'],falcon:['#505e67','#b33d38','wings'],winter:['#252b30','#adb9c1','hair'],warmachine:['#303740','#8b9ca8','armor'],rocket:['#775947','#b87d3f','small'],groot:['#64513a','#748a46','tree'],gamora:['#252d34','#537f42','green']
};
function material(color,metal=.15,rough=.55,glow=0){return new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough,emissive:color,emissiveIntensity:glow});}
function mesh(parent,geometry,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(p,w,h,d,mat,x=0,y=0,z=0){return mesh(p,new THREE.BoxGeometry(w,h,d),mat,x,y,z);}
function sphere(p,r,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=mesh(p,new THREE.SphereGeometry(r,18,12),mat,x,y,z);m.scale.set(sx,sy,sz);return m;}
function cylinder(p,top,bottom,h,mat,x=0,y=0,z=0){return mesh(p,new THREE.CylinderGeometry(top,bottom,h,16),mat,x,y,z);}
function ring(p,r,t,color,x=0,y=0,z=0){const m=mesh(p,new THREE.TorusGeometry(r,t,8,60),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.75}),x,y,z);m.rotation.x=-Math.PI/2;return m;}
function dispose(group){const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.clear();}

function makeActor(h,side){
 const [primary,accent,style]=SUITS[h.id];const group=new THREE.Group(),rig=new THREE.Group();group.add(rig);
 const suit=material(primary,style==='armor'?.75:.2,.4),trim=material(accent,.6,.3),skin=material(h.id==='gamora'?'#68934c':h.id==='vision'?'#943642':h.id==='hulk'?primary:h.id==='groot'?primary:'#c59a7d',.05,.75),dark=material('#151b22',.2,.6),eye=material('#d7f6ff',.2,.2,2);
 const masked=['mask','armor','visor','horns','tree','small'].includes(style)||h.id==='vision';
 sphere(rig,.42,suit,0,1.49,0,1.05,1.3,.63);sphere(rig,.31,suit,0,1.06,0,1,.8,.75);box(rig,.6,.12,.38,trim,0,1.1,0);
 sphere(rig,.25,masked?suit:skin,0,2.16,0,.88,1.12,.86);cylinder(rig,.1,.11,.15,skin,0,1.91,0);
 if(!masked&&style!=='chair'){const hair=material(h.id==='storm'?'#e0e6eb':['wanda','widow','jean'].includes(h.id)?'#6d251b':h.id==='thor'||h.id==='marvel'?'#c5a45b':'#211c1b',.05,.85);sphere(rig,.255,hair,0,2.25,-.025,.93,.55,.91);if(['cape','hair','crown','green'].includes(style))sphere(rig,.24,hair,0,2.08,-.13,.98,1.25,.47);}
 if(style==='armor'){box(rig,.28,.25,.08,trim,0,2.17,.2);box(rig,.36,.08,.06,eye,0,2.21,.246);const core=ring(rig,.085,.025,h.id==='warmachine'?'#fb8775':'#a4efff',0,1.64,.3);core.rotation.x=0;}
 else if(style==='visor'){box(rig,.4,.09,.07,trim,0,2.19,.21);box(rig,.3,.035,.025,material('#fa3238',.2,.2,3),0,2.19,.25);}
 else {[-1,1].forEach(s=>{const e=sphere(rig,.035,masked?eye:dark,s*.095,2.19,.203,1.5,.65,.5);if(masked)e.rotation.z=s*-.2;});}
 if(h.id==='wolverine'){[-1,1].forEach(s=>{const ear=mesh(rig,new THREE.ConeGeometry(.11,.34,4),dark,s*.16,2.42,0);ear.rotation.z=s*-.3;});}
 if(h.id==='panther'){[-1,1].forEach(s=>mesh(rig,new THREE.ConeGeometry(.065,.16,4),suit,s*.16,2.4,0));ring(rig,.21,.023,accent,0,1.88,0);}
 if(style==='horns'){[-1,1].forEach(s=>{const horn=mesh(rig,new THREE.ConeGeometry(.07,.5,12),trim,s*.19,2.5,.04);horn.rotation.z=s*-.3;});}
 if(style==='crown'){box(rig,.34,.055,.09,trim,0,2.32,.14);[-1,1].forEach(s=>{const c=mesh(rig,new THREE.ConeGeometry(.08,.18,3),trim,s*.17,2.37,.16);c.rotation.z=-s*.5;});}
 const arms=[],legs=[];
 for(const s of [-1,1]){
  const arm=new THREE.Group();arm.position.set(s*.43,1.8,0);rig.add(arm);sphere(arm,.19,suit,0,-.03,0,1,1,.95);cylinder(arm,.15,.115,.53,suit,0,-.3,0);const elbow=new THREE.Group();elbow.position.y=-.55;arm.add(elbow);cylinder(elbow,.12,.095,.45,h.id==='winter'&&s===-1?trim:suit,0,-.21,0);sphere(elbow,.12,masked?suit:skin,0,-.48,0,.85,1.15,1);arm.rotation.z=s*.12;elbow.rotation.x=-.18;arms.push({joint:arm,elbow,hand:elbow});
  const leg=new THREE.Group();leg.position.set(s*.18,.99,0);rig.add(leg);cylinder(leg,.165,.12,.52,suit,0,-.24,0);const knee=new THREE.Group();knee.position.y=-.49;leg.add(knee);cylinder(knee,.125,.085,.42,suit,0,-.2,0);box(knee,.2,.17,.35,trim,0,-.43,.065);legs.push({joint:leg,knee});
 }
 let cape;
 if(['cape','horns','crown'].includes(style)){const g=new THREE.PlaneGeometry(1.05,1.48,6,10);const a=g.attributes.position;for(let i=0;i<a.count;i++){const y=a.getY(i);a.setX(i,a.getX(i)*(1.1-(y+.74)*.37));}g.computeVertexNormals();cape=mesh(rig,g,new THREE.MeshStandardMaterial({color:accent,side:THREE.DoubleSide,roughness:.8}),0,1.15,-.29);cape.rotation.x=-.17;}
 if(h.id==='captain'){const shield=cylinder(arms[0].elbow,.31,.31,.075,material('#a33139',.65,.3),0,-.15,.12);shield.rotation.x=Math.PI/2;const inner=cylinder(shield,.23,.23,.078,material('#d0d7d8',.8,.22));const blue=cylinder(inner,.16,.16,.083,material('#365d94',.6,.3));sphere(blue,.055,eye,0,.05,0,1,.2,1);}
 if(h.id==='thor'){box(arms[1].hand,.09,.63,.09,material('#65503b'),0,-.49,.1);box(arms[1].hand,.46,.25,.25,trim,0,-.78,.1);}
 if(h.id==='wolverine'){arms.forEach(a=>[-1,0,1].forEach(i=>box(a.hand,.025,.4,.03,material('#b4cbd5',.95,.15),i*.065,-.75,.08)));}
 if(['gamora','deadpool'].includes(h.id)){const blade=box(arms[1].hand,.065,.95,.035,material('#a9bec3',.9,.2),0,-.98,0);blade.rotation.z=.15;box(arms[1].hand,.25,.04,.08,trim,0,-.54,0);}
 if(['hawkeye','punisher','rocket','warmachine'].includes(h.id))box(arms[1].hand,.12,.12,.6,dark,0,-.4,.24);
 if(style==='wings'){[-1,1].forEach(s=>{const wing=box(rig,1.05,.48,.035,trim,s*.85,1.75,-.12);wing.rotation.z=s*.3;});}
 if(style==='chair'){const chair=new THREE.Group();group.add(chair);box(chair,.65,.7,.15,dark,0,1,-.24);box(chair,.7,.12,.6,dark,0,.65,0);[-1,1].forEach(s=>{const wheel=mesh(chair,new THREE.TorusGeometry(.38,.045,8,24),trim,s*.48,.42,0);wheel.rotation.y=Math.PI/2;});rig.position.y=-.35;legs.forEach(l=>l.joint.rotation.x=-1.15);}
 if(style==='small'){[-1,1].forEach(s=>sphere(rig,.105,suit,s*.16,2.4,0,.8,1,.5));sphere(rig,.13,trim,0,2.1,.2,1,.6,.7);}
 if(style==='tree'){for(let i=0;i<8;i++){const branch=box(rig,.045,.45,.06,trim,(i%2?1:-1)*.23,2.3+i*.025,-.08);branch.rotation.z=(i%2?1:-1)*(.3+i*.05);}}
 if(h.id==='punisher'){box(rig,.25,.28,.025,trim,0,1.65,.275);box(rig,.16,.12,.03,trim,0,1.45,.27);}
 const scale=style==='big'?1.32:style==='tree'?1.22:style==='small'?.7:1;rig.scale.setScalar(scale);if(style==='big')rig.scale.x*=1.22;
 const pad=ring(group,.47,.014,side===0?'#8bcdac':'#eaa76b',0,.025,0);const shield=sphere(group,1.5,new THREE.MeshBasicMaterial({color:'#8ca9ff',transparent:true,opacity:.07,wireframe:true}),0,1.15,0,.57,.92,.57);shield.visible=false;
 return {id:h.id,side,group,rig,arms,legs,cape,pad,shield,scale,hp:1,maxHp:1,dead:0,home:V(),yaw:side===0?1.03:-1.03,label:null};
}

export class Arena3D{
 constructor(){
  this.actors=new Map();this.effects=new THREE.Group();this.time=0;this.frame=0;this.lastEvent=null;this.action=null;this.cameraMode='wide';this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.5;this.renderer.domElement.setAttribute('aria-hidden','true');
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(40,1,.1,150);this.environment=new THREE.Group();this.units=new THREE.Group();this.scene.add(this.environment,this.units,this.effects);
  this.resizeObserver=new ResizeObserver(()=>this.resize());
  const glow=document.createElement('canvas');glow.width=glow.height=64;const c=glow.getContext('2d'),gradient=c.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'#fff');gradient.addColorStop(.12,'#ffffffdd');gradient.addColorStop(.4,'#ffffff66');gradient.addColorStop(1,'#ffffff00');c.fillStyle=gradient;c.fillRect(0,0,64,64);this.glow=new THREE.CanvasTexture(glow);
 }
 mount(host,labels,hitLabel,game,battle,event,speed){
  this.host=host;this.labels=labels;this.hitLabel=hitLabel;this.cameraMode=game.camera||'wide';host.appendChild(this.renderer.domElement);this.resizeObserver.disconnect();this.resizeObserver.observe(host);
  const key=game.arena+'|'+game.players.flatMap(p=>p.team).join(',');if(key!==this.key){this.buildEnvironment(game.arena);dispose(this.units);this.actors.clear();game.players.forEach((p,side)=>p.team.forEach((id,i)=>{const actor=makeActor(hero(id),side),n=p.team.length;actor.home.set((side===0?-1:1)*(3.2+(i%2)*2),0,(i-(n-1)/2)*2.25);actor.group.position.copy(actor.home);actor.rig.rotation.y=actor.yaw;this.units.add(actor.group);this.actors.set(id,actor);}));this.key=key;this.lastEvent=null;this.clearEffects();this.action=null;}
  labels.replaceChildren();this.actors.forEach(actor=>{const f=battle?.fighters[actor.side].find(f=>f.id===actor.id);actor.hp=f?.hp??1;actor.maxHp=f?.maxHp??1;actor.shield.visible=(f?.shield??0)>0;if(!battle||!battle.events.length){actor.dead=0;actor.rig.rotation.z=0;actor.group.position.copy(actor.home);}const label=document.createElement('div');label.className='actor-label side-'+actor.side+(actor.hp===0?' is-ko':'');const title=document.createElement('b');title.textContent=hero(actor.id).name;const health=document.createElement('span');health.className='actor-health';const fill=document.createElement('i');fill.style.width=100*actor.hp/actor.maxHp+'%';health.append(fill);label.append(title,health);labels.append(label);actor.label=label;});
  if(event&&event!==this.lastEvent){this.lastEvent=event;this.animate(event,speed);}else if(!event){this.lastEvent=null;this.action=null;this.clearEffects();}
  this.resize();this.resume();
 }
 resize(){if(!this.host?.isConnected)return;const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 pause(){cancelAnimationFrame(this.frame);this.frame=0;this.resizeObserver.disconnect();}
 resume(){if(this.frame)return;this.prev=performance.now();this.frame=requestAnimationFrame(t=>this.update(t));}
 clearEffects(){dispose(this.effects);}
 buildEnvironment(map){
  dispose(this.environment);this.scene.background=new THREE.Color(map==='city'?'#101c30':map==='asgard'?'#1d193a':'#092520');this.scene.fog=new THREE.FogExp2(this.scene.background,map==='city'?.026:.019);
  const env=this.environment;env.add(new THREE.HemisphereLight(map==='asgard'?'#aaa0ff':'#a8d4ff',map==='wakanda'?'#233e24':'#30292d',2));
  const sun=new THREE.DirectionalLight(map==='asgard'?'#ffc788':'#bdd6ff',3.6);sun.position.set(-7,15,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.normalBias=.04;env.add(sun);
  const rim=new THREE.DirectionalLight(map==='city'?'#ff865b':map==='asgard'?'#b481ff':'#53e7d7',3);rim.position.set(4,5,-12);env.add(rim);
  const floor=material(map==='asgard'?'#51434b':map==='wakanda'?'#234036':'#2e3947',map==='asgard'?.7:.35,.45);box(env,19,.45,13,floor,0,-.3,0);const led=material(map==='city'?'#6cc7ef':map==='asgard'?'#f7c37a':'#67e2cc',.4,.3,2);
  for(const x of [-9.4,9.4])box(env,.08,.1,13,led,x,.01,0);for(const z of [-6.35,6.35])box(env,19,.08,.08,led,0,.01,z);
  const seam=material('#111d26',.3,.65);for(let i=-8;i<=8;i+=2)box(env,.018,.007,12,seam,i,-.063,0);for(let i=-5;i<=5;i+=2)box(env,18,.007,.018,seam,0,-.06,i);
  ring(env,1.4,.028,map==='asgard'?'#e5c492':'#628fa0',0,-.055,0);ring(env,1.6,.008,'#667d87',0,-.054,0);for(const side of [-1,1]){const lamp=new THREE.PointLight(side===-1?'#80baca':'#d89c6b',8,12,2);lamp.position.set(side*7,2,1);env.add(lamp);}
  if(map==='city')this.city(env);else if(map==='asgard')this.asgard(env,led);else this.wakanda(env,led);
  const positions=[];for(let i=0;i<190;i++){const x=Math.sin(i*57.43)*52,y=9+((i*13)%27),z=-14-Math.abs(Math.cos(i*34.63))*40;positions.push(x,y,z);}const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));env.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:map==='asgard'?'#d2c9ff':'#bdd7e2',size:.055,transparent:true,opacity:.7})));
 }
 city(env){
  const building=material('#172333',.35,.75),windows=material('#b8d9ec',.1,.35,2),warm=material('#e4bb7e',.1,.4,1.8);const windowGeo=new THREE.BoxGeometry(.22,.35,.018),win=new THREE.InstancedMesh(windowGeo,windows,500),matrix=new THREE.Matrix4();let count=0;
  for(let i=0;i<20;i++){const x=(i-9.5)*2.8,z=-10-(i%3)*3,h=4+(i*7%14),w=1.7+(i%3)*.4;box(env,w,h,2,building,x,h/2-2,z);for(let y=.5;y<h-2&&count<490;y+=.8)for(let q=-.5;q<=.5;q+=.5){if((i+Math.round(y*10)+q*2)%4===0)continue;matrix.makeTranslation(x+q,y,z+1.015);win.setMatrixAt(count++,matrix);}if(i%3===0)box(env,.1,3,.1,material('#4a5767'),x,h-1,z);}
  win.count=count;env.add(win);const rail=material('#536372',.6,.4);for(const z of [-6,6]){box(env,19,.08,.08,rail,0,.65,z);for(let x=-9;x<=9;x+=1.5)box(env,.06,.68,.06,rail,x,.31,z);}for(const x of [-8,8]){box(env,1.2,.7,1.5,material('#414b58',.6,.45),x,.27,-4.6);for(let i=0;i<6;i++)box(env,1.04,.028,.04,rail,x,.64,-5+i*.14);}
  const moon=sphere(env,1.1,new THREE.MeshBasicMaterial({color:'#b4c4d7'}),-16,17,-37);moon.castShadow=false;for(let i=0;i<4;i++)box(env,.7,.07,.08,warm,-8+i*.15,.1,5.4);
 }
 asgard(env,led){
  const gold=material('#9f7e4b',.8,.27),stone=material('#574358',.55,.45);for(const x of [-8,8])for(const z of [-4.5,4.5]){cylinder(env,.28,.42,5,gold,x,2.3,z);cylinder(env,.65,.65,.2,gold,x,.05,z);sphere(env,.33,led,x,4.85,z);const lamp=new THREE.PointLight('#ffc37c',10,9);lamp.position.set(x,4.6,z);env.add(lamp);}
  for(let i=-5;i<=5;i++){const height=8-Math.abs(i)*.8;box(env,1.4,height,3,stone,i*2,height/2-1,-15);mesh(env,new THREE.ConeGeometry(.95,3,6),gold,i*2,height+.5,-15);box(env,.14,height-1,.07,led,i*2,height/2,-13.45);}
  for(let i=0;i<7;i++){const r=ring(env,1.9+i*.28,.012,i%2?'#927be5':'#e2ac72',0,-.051,0);r.material.opacity=.35;}
  for(let i=0;i<5;i++){const rock=mesh(env,new THREE.IcosahedronGeometry(2,0),stone,(i-2)*8,1+i%3,-24);rock.scale.y=.5;}
 }
 wakanda(env,led){
  const bark=material('#283b2d',.1,.8),leaves=material('#244d35',.05,.9),metal=material('#284447',.75,.3);for(let i=0;i<26;i++){const x=Math.sin(i*3.5)*23,z=-9-(i%5)*3,y=4+(i%4);cylinder(env,.15,.32,y,bark,x,y/2,z);for(let k=0;k<3;k++)sphere(env,1.5,leaves,x+Math.cos(k*2)*.7,y-.3+k*.4,z+Math.sin(k*2),1.4,.7,1);}
  for(let i=-3;i<=3;i++){const h=8+Math.abs(i)*.5;const tower=cylinder(env,.18,.95,h,metal,i*4,h/2,-17);mesh(env,new THREE.ConeGeometry(.4,1.5,12),led,i*4,h+.4,-17);box(env,.05,h,.055,led,i*4,h/2,-16.4);}
  for(const x of [-8,8]){const dome=sphere(env,1.1,metal,x,.4,-4.8,1,.7,1);ring(env,1.1,.035,'#67e2cc',x,.15,-4.8);dome.receiveShadow=true;}
 }
 animate(event,speed){
  this.clearEffects();const attacker=this.actors.get(event.attacker),target=this.actors.get(event.target);if(!attacker||!target)return;
  const h=hero(event.attacker);const ranged=h.stats[5]>=8||h.type==='Teknoloji'||['hawkeye','punisher','rocket','cyclops','professor'].includes(h.id);this.action={event,attacker,target,start:performance.now(),duration:this.reduced?250:1450/speed,ranged,impacted:false};
  const color=event.special?h.color:h.id==='thor'||h.id==='storm'?'#a6ddff':h.type==='Mistik'?'#ed8364':h.type==='Teknoloji'?'#8eeaff':'#e3bf88';
  const glowMat=new THREE.SpriteMaterial({map:this.glow,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});const projectile=new THREE.Group();sphere(projectile,.085,new THREE.MeshBasicMaterial({color}));const glow=new THREE.Sprite(glowMat);glow.scale.set(1.2,1.2,1.2);projectile.add(glow);projectile.visible=false;this.effects.add(projectile);this.action.projectile=projectile;
  const impact=new THREE.Group();this.effects.add(impact);const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));halo.scale.setScalar(event.crit?2.7:1.9);impact.add(halo);impact.visible=false;this.action.impact=impact;this.action.halo=halo;
  const sparks=[];for(let i=0;i<18;i++){const spark=sphere(impact,.018,new THREE.MeshBasicMaterial({color:i%2?'#fff4c9':color}));sparks.push({mesh:spark,velocity:V(Math.sin(i*12.13)*2.5,.6+(i%5)*.45,Math.cos(i*5.38)*2.5)});}this.action.sparks=sparks;
  if(event.special){const aura=ring(this.effects,.55,.025,color,attacker.home.x,.07,attacker.home.z);this.action.aura=aura;}
  if(ranged){const lightning=['thor','storm'].includes(h.id);const beam=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:12},()=>V())),new THREE.LineBasicMaterial({color:h.id==='cyclops'?'#ff4c54':color,transparent:true,opacity:.8,blending:THREE.AdditiveBlending}));beam.visible=false;this.effects.add(beam);this.action.beam=beam;this.action.lightning=lightning;}
  if(event.special&&h.ability==='aoe'){const wave=ring(this.effects,.3,.05,color,target.home.x,.06,target.home.z);wave.visible=false;this.action.wave=wave;}
  this.hitLabel.textContent=event.dodge?'KAÇIŞ':(event.crit?'KRİTİK ':'')+'−'+event.damage;this.hitLabel.className='arena-hit-label'+(event.crit?' critical':'');this.hitLabel.style.opacity=0;
 }
 update(now){
  this.frame=0;if(!this.host?.isConnected)return;const dt=Math.min((now-this.prev)/1000,.04);this.prev=now;this.time+=dt;
  const ratio=this.camera.aspect,narrow=ratio<1.25,dist=narrow?21:14.5;const cameraTarget=V(0,narrow?22:11,dist);let look=V(0,.8,0);
  if(this.cameraMode==='close'){cameraTarget.set(0,narrow?17:9,narrow?16:12.5);if(this.action){const center=this.action.attacker.home.clone().lerp(this.action.target.home,.5);cameraTarget.x=center.x*.3;look=center.clone();look.y=1.2;}}
  this.camera.position.lerp(cameraTarget,dt*3);if(this.camera.position.length()<2)this.camera.position.copy(cameraTarget);this.camera.lookAt(look);
  const action=this.action,p=action?clamp((now-action.start)/action.duration):1;
  this.actors.forEach(a=>{
   a.group.position.copy(a.home);a.rig.rotation.y=a.yaw;a.rig.rotation.x=0;a.rig.position.y=SUITS[a.id][2]==='chair'?-.35:Math.sin(this.time*2.1+a.home.z)*.016;a.arms.forEach((arm,i)=>{arm.joint.rotation.x=-.08+Math.sin(this.time*1.7+i)*.04;arm.elbow.rotation.x=-.25;});a.legs.forEach(l=>l.joint.rotation.x=SUITS[a.id][2]==='chair'?-1.15:0);
   if(a.cape&&!this.reduced){a.cape.rotation.x=-.17+Math.sin(this.time*2+a.home.z)*.04;a.cape.rotation.z=Math.sin(this.time*1.5)*.022;}a.pad.material.opacity=.3+Math.sin(this.time*2)*.1;
   const waitingDeath=action&&p<.5&&(a===action.target||action.event.special);if(a.hp===0&&!waitingDeath){a.dead=Math.min(1,a.dead+dt*3);a.rig.rotation.z=a.dead*(a.side===0?1:-1)*1.5;a.rig.position.y-=a.dead*.85;a.pad.visible=false;}else if(a.hp>0){a.dead=0;a.rig.rotation.z=0;a.pad.visible=true;}
  });
  if(action&&p<1){
   const {attacker:a,target:t,event:e}=action,dir=t.home.clone().sub(a.home).normalize();const swing=Math.sin(clamp((p-.18)/.4)*Math.PI);
   if(!action.ranged){const distance=Math.max(0,a.home.distanceTo(t.home)-1.3),travel=p<.5?Math.sin(clamp(p/.5)*Math.PI/2):Math.cos(clamp((p-.5)/.5)*Math.PI/2);a.group.position.addScaledVector(dir,distance*travel);a.rig.rotation.y=Math.atan2(dir.x,dir.z);a.legs.forEach((leg,i)=>leg.joint.rotation.x=Math.sin(p*24+i*Math.PI)*.5*Math.sin(p*Math.PI));}
   a.arms[1].joint.rotation.x=-swing*1.65;a.arms[1].elbow.rotation.x=-.3+Math.sin(p*Math.PI)*.3;a.rig.rotation.x=Math.sin(p*Math.PI)*.1;
   if(action.ranged&&p>.18&&p<.56){const q=(p-.18)/.38,from=a.group.position.clone().add(V(0,1.6,0)),to=t.home.clone().add(V(0,1.35,0));action.projectile.visible=true;action.projectile.position.copy(from.clone().lerp(to,q));action.projectile.scale.setScalar(e.special?1.4:1);if(action.beam){action.beam.visible=true;const positions=action.beam.geometry.attributes.position;for(let i=0;i<12;i++){const point=from.clone().lerp(action.projectile.position,i/11);if(action.lightning&&i>0&&i<11){point.y+=Math.sin(i*12.3+now*.04)*.2;point.z+=Math.cos(i*13.7+now*.03)*.16;}positions.setXYZ(i,point.x,point.y,point.z);}positions.needsUpdate=true;action.beam.geometry.computeBoundingSphere();action.beam.material.opacity=Math.sin(q*Math.PI)*.85;}}
   else {action.projectile.visible=false;if(action.beam)action.beam.visible=false;}
   if(action.aura){action.aura.scale.setScalar(1+p*2.5);action.aura.material.opacity=(1-p)*.8;}
   if(p>.48){
    const q=clamp((p-.48)/.52);if(e.dodge)t.group.position.z+=Math.sin(q*Math.PI)*.8;else {t.rig.rotation.z=Math.sin(q*Math.PI*3)*.16;t.group.position.addScaledVector(dir,Math.sin(q*Math.PI)*.16);action.impact.visible=true;action.impact.position.copy(t.home).add(V(0,1.4,0));action.halo.material.opacity=(1-q)*.7;action.sparks.forEach(s=>{s.mesh.position.copy(s.velocity).multiplyScalar(q);s.mesh.position.y-=q*q*2;});}
    if(action.wave&&!e.dodge){action.wave.visible=true;action.wave.scale.setScalar(1+q*14);action.wave.material.opacity=1-q;}
    const position=t.home.clone().add(V(0,2.9+q*.7,0)).project(this.camera);this.hitLabel.style.left=(position.x*.5+.5)*100+'%';this.hitLabel.style.top=(-position.y*.5+.5)*100+'%';this.hitLabel.style.opacity=1-q;
    if(e.crit&&!this.reduced){this.camera.position.x+=Math.sin(q*70)*.06*(1-q);this.camera.lookAt(look);}
   }
  }else if(action){this.hitLabel.style.opacity=0;this.clearEffects();this.action=null;}
  this.actors.forEach(a=>{const pos=a.group.position.clone().add(V(0,2.68*a.scale,0)).project(this.camera);if(a.label){a.label.style.left=(pos.x*.5+.5)*100+'%';a.label.style.top=(-pos.y*.5+.5)*100+'%';a.label.style.opacity=a.hp===0?.25:1;}});
  this.renderer.render(this.scene,this.camera);this.frame=requestAnimationFrame(t=>this.update(t));
 }
}
