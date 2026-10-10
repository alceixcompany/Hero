import * as THREE from './vendor/three.module.js';
import {loadCharacter} from './character-models.mjs';

export class CharacterPreview{
 constructor(host,h){
  this.host=host;this.hero=h;this.mode='idle';this.clock=0;this.frame=0;this.closed=false;this.dragging=false;
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.4;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.domElement.setAttribute('aria-label',h.name+' animasyonlu 3B model');host.append(this.renderer.domElement);
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#182637');this.camera=new THREE.PerspectiveCamera(35,1,.1,60);this.root=new THREE.Group();this.scene.add(this.root);
  this.scene.add(new THREE.HemisphereLight('#d3e7ff','#354252',3));
  const key=new THREE.DirectionalLight('#ffe1bf',3.5);key.position.set(-3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-3;key.shadow.camera.right=3;key.shadow.camera.top=4;key.shadow.camera.bottom=-2;key.shadow.normalBias=.03;this.scene.add(key);
  const rim=new THREE.DirectionalLight(h.color,4);rim.position.set(3,3,-3);this.scene.add(rim);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(4,64),new THREE.MeshStandardMaterial({color:'#23374c',roughness:.8}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.025;this.scene.add(floor);
  const platform=new THREE.Mesh(new THREE.TorusGeometry(.68,.009,8,64),new THREE.MeshBasicMaterial({color:h.color}));platform.rotation.x=-Math.PI/2;platform.position.y=.01;this.scene.add(platform);
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
  this.down=e=>{this.dragging=true;this.pointer=e.clientX;host.setPointerCapture(e.pointerId);};
  this.move=e=>{if(this.dragging){this.root.rotation.y+=(e.clientX-this.pointer)*.015;this.pointer=e.clientX;}};
  this.up=()=>{this.dragging=false;};host.addEventListener('pointerdown',this.down);host.addEventListener('pointermove',this.move);host.addEventListener('pointerup',this.up);host.addEventListener('pointercancel',this.up);
  this.event={attacker:h.id,special:false,dodge:false};this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  loadCharacter(h.id).then(model=>{
   if(this.closed){model.dispose();return;}this.model=model;model.object.scale.multiplyScalar(model.profile.height/2.4);this.root.add(model.object);this.root.rotation.y=-.22;
   const height=model.profile.height;this.camera.position.set(0,height*.65,height*2.35);this.camera.lookAt(0,height*.49,0);host.dataset.model='rigged';host.querySelector('.model-loading')?.remove();this.resize();
  }).catch(e=>{host.dataset.model='failed';const text=host.querySelector('.model-loading');if(text)text.textContent='Model açılamadı. Portre görünümünü kullanabilirsin.';console.warn('Character preview unavailable',h.id,e);});
  this.resize();this.prev=performance.now();this.frame=requestAnimationFrame(t=>this.update(t));
 }
 resize(){if(!this.host.isConnected)return;const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;if(w!==this.w||h!==this.h){this.w=w;this.h=h;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}}
 setMode(mode){this.mode=mode;this.clock=0;}
 update(now){
  if(this.closed||!this.host.isConnected)return;const dt=Math.min(.04,Math.max(0,(now-this.prev)/1000));this.prev=now;if(!this.reduced)this.clock+=dt;
  const attacking=this.mode==='attack',p=attacking?Math.min(1,(this.clock%2.6)/1.65):1;
  this.model?.update({dt,playing:!this.reduced,moving:this.mode==='walk'?.35:0,flight:this.hero.flight&&this.mode==='idle',event:attacking?this.event:null,role:attacking?'attacker':null,progress:p});
  this.root.position.y=this.hero.flight&&this.mode==='idle'? .2+Math.sin(this.clock*2)*.045:0;
  this.renderer.render(this.scene,this.camera);this.frame=requestAnimationFrame(t=>this.update(t));
 }
 dispose(){
  this.closed=true;cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.host.removeEventListener('pointerdown',this.down);this.host.removeEventListener('pointermove',this.move);this.host.removeEventListener('pointerup',this.up);this.host.removeEventListener('pointercancel',this.up);this.model?.dispose();
  this.scene.traverse(n=>{if(n.isLight&&n.shadow)n.shadow.dispose();if(n.isMesh&&!n.isSkinnedMesh){if(!n.geometry.userData.shared)n.geometry.dispose();n.material.dispose();}});this.renderer.dispose();this.renderer.domElement.remove();
 }
}
