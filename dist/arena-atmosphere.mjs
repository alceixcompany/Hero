import * as THREE from './vendor/three.module.js';
const PALETTES={city:{top:'#071426',horizon:'#aa685b',mist:'#293e59',accent:'#8edfff'},asgard:{top:'#100d2c',horizon:'#7b5a95',mist:'#332c59',accent:'#ffcf84'},wakanda:{top:'#06262c',horizon:'#597e74',mist:'#183e40',accent:'#75f2cf'}};
export function addAtmosphere(env,map,glow){
 const palette=PALETTES[map]??PALETTES.city;
 const sky=new THREE.Mesh(new THREE.SphereGeometry(110,32,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color(palette.top)},horizon:{value:new THREE.Color(palette.horizon)}},vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 top;uniform vec3 horizon;varying vec3 vDirection;void main(){float h=normalize(vDirection).y;vec3 c=mix(horizon,top,smoothstep(-0.12,0.42,h));gl_FragColor=vec4(c,1.0); #include <tonemapping_fragment> \n #include <colorspace_fragment> }'}));
 sky.material.fragmentShader=sky.material.fragmentShader.replace('; #include',';\n #include');sky.frustumCulled=false;env.add(sky);
 const haze=[];
 for(let i=0;i<7;i++){
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:palette.mist,transparent:true,opacity:.14,depthWrite:false}));
  sprite.position.set((i-3)*12,2+(i%3)*2,-20-(i%2)*9);sprite.scale.set(24,5,1);env.add(sprite);haze.push({sprite,x:sprite.position.x,phase:i*1.4});
 }
 const count=map==='city'?65:105,positions=new Float32Array(count*3),seeds=[];
 for(let i=0;i<count;i++){const x=Math.sin(i*17.71)*14,y=.4+(i*7%43)/10,z=Math.cos(i*13.23)*10;positions.set([x,y,z],i*3);seeds.push({x,y,z,phase:i*2.31});}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const motes=new THREE.Points(geo,new THREE.PointsMaterial({map:glow,color:map==='asgard'?'#ffd996':palette.accent,size:map==='city'?.055:.075,transparent:true,opacity:.42,depthWrite:false,blending:THREE.AdditiveBlending}));env.add(motes);
 const accents=[];
 for(const side of [-1,1])for(let i=0;i<4;i++){
  const g=new THREE.Group();g.position.set(side*9.15,.04,(i-1.5)*3.3);env.add(g);
  const strip=new THREE.Mesh(new THREE.BoxGeometry(.13,.045,1.45),new THREE.MeshBasicMaterial({color:palette.accent}));g.add(strip);
  const light=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:palette.accent,transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending}));light.position.y=.1;light.scale.set(1.7,.65,1);g.add(light);accents.push(light);
 }
 // Thin landing markings and large raised panels give the platform a believable scale.
 const panelMat=new THREE.MeshPhysicalMaterial({color:map==='city'?'#33455c':map==='asgard'?'#594765':'#254c49',metalness:.45,roughness:.43,clearcoat:.65,clearcoatRoughness:.32});
 for(let x=-6;x<=6;x+=3)for(let z=-4.5;z<=4.5;z+=3){const panel=new THREE.Mesh(new THREE.BoxGeometry(2.96,.018,2.96),panelMat);panel.position.set(x,-.061,z);panel.receiveShadow=true;env.add(panel);}
 if(map==='city'){
  const marking=new THREE.MeshBasicMaterial({color:'#c7c9b9',transparent:true,opacity:.32});
  for(const x of [-7.8,7.8])for(let z=-4;z<=4;z+=1.2){const line=new THREE.Mesh(new THREE.BoxGeometry(.045,.006,.5),marking);line.position.set(x,-.044,z);env.add(line);}
 }
 const ring=new THREE.Mesh(new THREE.TorusGeometry(2.4,.018,8,96),new THREE.MeshBasicMaterial({color:palette.accent,transparent:true,opacity:.18}));ring.rotation.x=-Math.PI/2;ring.position.y=-.039;env.add(ring);
 const timeUniform={value:0};
 if(map==='asgard'){
  const gate=new THREE.Group();gate.position.set(0,6.5,-12);env.add(gate);
  for(const [radius,thickness,hex] of [[3.6,.11,'#c9a35c'],[3.4,.025,'#ffe4ac'],[3.9,.018,'#a597ff']])gate.add(new THREE.Mesh(new THREE.TorusGeometry(radius,thickness,8,100),new THREE.MeshBasicMaterial({color:hex})));
  const portal=new THREE.Mesh(new THREE.CircleGeometry(3.35,64),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:timeUniform},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform float time;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float swirl=sin(r*25.-time*1.2+atan(p.y,p.x)*4.);vec3 color=mix(vec3(.22,.12,.5),vec3(.9,.63,.28),smoothstep(.55,1.,r));gl_FragColor=vec4(color,.3*(1.-smoothstep(.85,1.,r))+.13*swirl*swirl);}' }));gate.add(portal);
  const glowLight=new THREE.PointLight('#a99bff',12,20,2);glowLight.position.set(0,6,-9);env.add(glowLight);
 }
 if(map==='wakanda'){
  const shield=new THREE.Mesh(new THREE.CylinderGeometry(20,20,8,64,1,true,Math.PI*.62,Math.PI*.76),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:timeUniform},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform float time;void main(){float grid=pow(abs(sin(vUv.x*155.)*sin(vUv.y*48.)),12.);float wave=pow(.5+.5*sin(vUv.y*7.-time*.5),8.);gl_FragColor=vec4(.21,.83,.73,(grid*.12+wave*.025)*sin(vUv.y*3.14159));}' }));shield.position.set(0,2,-5);env.add(shield);
 }
 let visualTime=0;
 return {update(dt,active,reduced){
  if(active&&!reduced)visualTime+=dt;
  timeUniform.value=visualTime;
  haze.forEach(({sprite,x,phase})=>{sprite.position.x=x+Math.sin(visualTime*.035+phase)*2;});
  const attr=geo.attributes.position;seeds.forEach((s,i)=>{attr.setXYZ(i,s.x+Math.sin(visualTime*.2+s.phase)*.35,(s.y+visualTime*(map==='asgard'?.12:.045))%5,s.z+Math.cos(visualTime*.14+s.phase)*.25);});attr.needsUpdate=true;
  accents.forEach((s,i)=>s.material.opacity=.17+Math.sin(visualTime*.9+i)*.04);
 }};
}
