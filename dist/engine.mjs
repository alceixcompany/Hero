import {resolvedPlan,validPlan,adjacent,zoneOf,selectTarget} from './strategy.mjs';
import {TEAM_LINKS,LINK_CHARGE,teamLinks} from './team-links.mjs';
export {TEAM_LINKS,LINK_CHARGE,teamLinks} from './team-links.mjs';
export const STAT_LABELS=['Güç','Zekâ','Hız','Dayanıklılık','Teknoloji','Enerji'];
export const HEROES=[
{id:'ironman',name:'Iron Man',alias:'Tony Stark',type:'Teknoloji',group:'Avengers',color:'#e69b45',stats:[7,10,7,8,10,7],skill:'Ark reaktörü',desc:'Zırhını akıllıca kullanır. Reaktör atışı, savunmanın bir bölümünü deler.',ability:'pierce',quote:'Bir zırhtan çok daha fazlası.'},
{id:'spiderman',name:'Spider-Man',alias:'Peter Parker',type:'Çeviklik',group:'Avengers',color:'#e45249',stats:[6,8,10,6,6,4],skill:'Örümcek hissi',desc:'Çevikliğiyle saldırılardan kaçar. Ağ atışı rakibin bir sonraki hamlesini zayıflatır.',ability:'weaken',quote:'Büyük güç. Büyük sorumluluk.'},
{id:'thor',name:'Thor',alias:'Odinson',type:'Kozmik',group:'Asgard',color:'#9dc8db',stats:[10,5,6,10,2,10],skill:'Yıldırım çağrısı',desc:'Mjölnir ile büyük hasar verir. Yıldırım, tüm rakiplere ek hasar yayar.',ability:'aoe',quote:'Fırtına senin tarafında.'},
{id:'hulk',name:'Hulk',alias:'Bruce Banner',type:'Güç',group:'Avengers',color:'#92b063',stats:[10,6,4,10,2,5],skill:'Öfke patlaması',desc:'Canı azaldıkça daha sert vurur. Öfke patlaması kendini de iyileştirir.',ability:'heal',quote:'Bazı sorunlar güçle çözülür.'},
{id:'strange',name:'Doctor Strange',alias:'Stephen Strange',type:'Mistik',group:'Mistik',color:'#d4a765',stats:[4,10,6,6,4,10],skill:'Ayna boyutu',desc:'Büyü saldırıları yapar. Ayna boyutu takımına koruyucu bir kalkan sağlar.',ability:'shield',quote:'Olasılıklar sonsuz. Kararın tek.'},
{id:'panther',name:'Black Panther',alias:"T’Challa",type:'Teknoloji',group:'Wakanda',color:'#aa8bda',stats:[7,9,9,8,9,5],skill:'Kinetik darbe',desc:'Vibranyum zırhıyla dayanır. Biriktirdiği enerjiyi savunma delen bir darbe ile bırakır.',ability:'pierce',quote:'Bir kralın gücü, halkından gelir.'},
{id:'wanda',name:'Scarlet Witch',alias:'Wanda Maximoff',type:'Mistik',group:'Mistik',color:'#df6665',stats:[4,8,6,5,2,10],skill:'Kaos büyüsü',desc:'Kaos enerjisi tüm rakiplere yayılır. Güçlüdür, ancak savunması kırılgandır.',ability:'aoe',quote:'Gerçeklik, senin ellerinde.'},
{id:'captain',name:'Captain America',alias:'Steve Rogers',type:'Taktik',group:'Avengers',color:'#7197b9',stats:[7,8,7,9,5,3],skill:'Vibranyum kalkan',desc:'Dengeli bir ön saftır. Kalkan hamlesi bütün takımını korur.',ability:'shield',quote:'Son ana kadar ayaktayım.'},
{id:'widow',name:'Black Widow',alias:'Natasha Romanoff',type:'Taktik',group:'Avengers',color:'#cc7c64',stats:[4,9,8,5,8,3],skill:'Dul ısırığı',desc:'Taktik ve hassasiyetle savaşır. Elektroşok, hedefin bir sonraki saldırısını zayıflatır.',ability:'weaken',quote:'En güçlü silah, doğru hamle.'},
{id:'loki',name:'Loki',alias:'Laufeyson',type:'Mistik',group:'Asgard',color:'#92a777',stats:[5,10,7,6,3,9],skill:'İllüzyon',desc:'Zekâsıyla rakibini şaşırtır. İllüzyon, hedefin bir sonraki hamlesini zayıflatır.',ability:'weaken',quote:'Her oyunun bir hilesi vardır.'},
{id:'marvel',name:'Captain Marvel',alias:'Carol Danvers',type:'Kozmik',group:'Kozmik',color:'#ddb566',stats:[9,6,9,9,5,10],skill:'Foton patlaması',desc:'Kozmik gücüyle saldırır. Foton patlaması tüm rakiplere ek hasar verir.',ability:'aoe',quote:'Daha yükseğe. Daha ileriye.'},
{id:'hawkeye',name:'Hawkeye',alias:'Clint Barton',type:'Taktik',group:'Avengers',color:'#b097cb',stats:[4,8,7,5,8,3],skill:'Patlayıcı ok',desc:'Teknolojiyi hassas atışlarla birleştirir. Özel oku rakibin savunmasını deler.',ability:'pierce',quote:'Tek bir ok her şeyi değiştirir.'},
{id:'wolverine',name:'Wolverine',alias:'Logan',type:'Güç',group:'X-Men',color:'#e4ba45',stats:[8,6,7,9,3,3],skill:'İyileşme faktörü',desc:'Adamantiyum pençeleriyle yakın dövüşür. Özel hamlede yaralarını iyileştirir.',ability:'heal',quote:'Pençelerim kadar inatçıyım.'},
{id:'deadpool',name:'Deadpool',alias:'Wade Wilson',type:'Çeviklik',group:'X-Men',color:'#cd4b50',stats:[6,6,8,8,6,3],skill:'Yenilenme',desc:'Çift kılıcıyla baskı kurar. Yenilenme yeteneğiyle savaşta can kazanır.',ability:'heal',quote:'Planım var. Çoğu zaman.'},
{id:'storm',name:'Storm',alias:'Ororo Munroe',type:'Kozmik',group:'X-Men',color:'#a3cbe2',stats:[4,8,8,6,3,10],skill:'Kasırga',desc:'Havayı kontrol eder. Yıldırımları ve kasırga etkisi tüm rakiplere hasar verir.',ability:'aoe',quote:'Gökyüzü, benim cevabım.'},
{id:'cyclops',name:'Cyclops',alias:'Scott Summers',type:'Taktik',group:'X-Men',color:'#e4b454',stats:[5,8,6,6,7,9],skill:'Optik patlama',desc:'Vizöründen çıkan yoğun enerji, hedefin savunmasını deler.',ability:'pierce',quote:'Odaklan. Tek bir hedef.'},
{id:'jean',name:'Jean Grey',alias:'Jean Grey',type:'Mistik',group:'X-Men',color:'#dd9870',stats:[4,9,7,5,2,10],skill:'Telekinetik dalga',desc:'Zihinsel gücüyle savaşır. Telekinetik dalga tüm rakiplere yayılır.',ability:'aoe',quote:'Zihnin sınırları yoktur.'},
{id:'magneto',name:'Magneto',alias:'Erik Lehnsherr',type:'Mistik',group:'Kardeşlik',color:'#b27acf',stats:[5,10,6,7,8,9],skill:'Manyetik fırtına',desc:'Metali bir silaha dönüştürür. Manyetik fırtına tüm rakiplere hasar verir.',ability:'aoe',quote:'Metal bile irademe boyun eğer.'},
{id:'professor',name:'Professor X',alias:'Charles Xavier',type:'Mistik',group:'X-Men',color:'#88b9ca',stats:[2,10,3,4,7,10],skill:'Zihin kontrolü',desc:'Telepatiyle hedefin dengesini bozar ve sonraki saldırısını zayıflatır.',ability:'weaken',quote:'En büyük güç, anlamaktır.'},
{id:'daredevil',name:'Daredevil',alias:'Matt Murdock',type:'Çeviklik',group:'Defenders',color:'#cc5e57',stats:[5,8,9,6,4,3],skill:'Radar hissi',desc:'Yakın dövüşte duyularını kullanır. Hassas vuruş, hedefin sonraki saldırısını zayıflatır.',ability:'weaken',quote:'Korkunun ötesinde.'},
{id:'punisher',name:'Punisher',alias:'Frank Castle',type:'Taktik',group:'Defenders',color:'#a4a4a3',stats:[5,8,6,7,9,2],skill:'Zırh delici salvo',desc:'Taktik ekipmanıyla menzilli baskı kurar. Özel salvo, savunmanın bir bölümünü deler.',ability:'pierce',quote:'Her hamlenin bir bedeli var.'},
{id:'antman',name:'Ant-Man',alias:'Hank Pym',type:'Teknoloji',group:'Avengers',color:'#b3c8cd',stats:[6,10,8,6,10,3],skill:'Pym darbesi',desc:'Boyut değiştiren zırhı sayesinde yaklaşır. Özel hamlesi savunmayı deler.',ability:'pierce',quote:'Küçük bir hamle. Büyük bir etki.'},
{id:'wasp',name:'Wasp',alias:'Janet van Dyne',type:'Çeviklik',group:'Avengers',color:'#e6c477',stats:[3,8,10,4,9,6],skill:'Yaban arısı iğnesi',desc:'Kanatlarıyla hız kazanır. Enerji iğnesi rakibin sonraki saldırısını zayıflatır.',ability:'weaken',quote:'Hızımı hafife alma.'},
{id:'vision',name:'Vision',alias:'Vision',type:'Teknoloji',group:'Avengers',color:'#a3bb83',stats:[8,10,7,8,10,9],skill:'Yoğunluk alanı',desc:'Sentetik bedenini kontrol eder. Yoğunluk alanı takımına koruyucu kalkan verir.',ability:'shield',quote:'Olasılıkları görüyorum.'},
{id:'falcon',name:'Falcon',alias:'Sam Wilson',type:'Teknoloji',group:'Avengers',color:'#cc7d65',stats:[4,8,9,5,9,3],skill:'Hava saldırısı',desc:'Kanatları ve uçuş ekipmanıyla savaşır. Özel atışı hedefin savunmasını deler.',ability:'pierce',quote:'Yukarıdan her şey daha net.'},
{id:'winter',name:'Winter Soldier',alias:'Bucky Barnes',type:'Taktik',group:'Avengers',color:'#91a7af',stats:[7,7,7,8,8,2],skill:'Biyonik yumruk',desc:'Metal koluyla yakın dövüşür. Biyonik darbe, hedefin savunmasını deler.',ability:'pierce',quote:'Geçmişim değil, hamlem konuşur.'},
{id:'warmachine',name:'War Machine',alias:'James Rhodes',type:'Teknoloji',group:'Avengers',color:'#94b2c1',stats:[8,8,6,9,10,6],skill:'Ağır bombardıman',desc:'Ağır zırhıyla ön safta durur. Omuz silahları tüm rakiplere hasar yayar.',ability:'aoe',quote:'Ağır görev. Ağır zırh.'},
{id:'rocket',name:'Rocket Raccoon',alias:'Rocket',type:'Teknoloji',group:'Guardians',color:'#d6a267',stats:[3,10,8,4,10,4],skill:'Plazma topu',desc:'Kendi yaptığı silahlarla savaşır. Plazma topu hedefin savunmasını deler.',ability:'pierce',quote:'Biraz teknoloji her şeyi çözer.'},
{id:'groot',name:'Groot',alias:'Groot',type:'Güç',group:'Guardians',color:'#a5b573',stats:[8,4,3,10,1,6],skill:'Kök kalkanı',desc:'Dayanıklı gövdesiyle takımını korur. Kökleri tüm takımına kalkan verir.',ability:'shield',quote:'Ben Groot.'},
{id:'gamora',name:'Gamora',alias:'Gamora',type:'Çeviklik',group:'Guardians',color:'#8ab86c',stats:[7,8,9,7,5,3],skill:'Ölümcül kesiş',desc:'Kılıcı ve çevikliğiyle yakın dövüşür. Özel kesiş hedefin savunmasını deler.',ability:'pierce',quote:'Keskin bir karar yeter.'}
].map((h,i)=>({...h,flight:['ironman','thor','strange','wanda','marvel','storm','jean','magneto','wasp','vision','falcon','warmachine'].includes(h.id),combat:['hulk','spiderman','panther','captain','widow','wolverine','deadpool','daredevil','antman','winter','groot','gamora'].includes(h.id)?'melee':'ranged',index:i,rating:Math.round(h.stats.reduce((a,b)=>a+b)/6*10)}));
export const ARENAS=[{id:'city',name:'New York',label:'ŞEHİR ÇATILARI',desc:'Teknoloji ve zekâ saldırıları %10 güçlenir.',boost:[1,4],color:'#d97949'}, {id:'asgard',name:'Asgard',label:'GÖKKUŞAĞI KÖPRÜSÜ',desc:'Güç ve enerji saldırıları %10 güçlenir.',boost:[0,5],color:'#ab91d5'}, {id:'wakanda',name:'Wakanda',label:'VİBRANYUM VADİSİ',desc:'Dayanıklılık ve hız %10 güçlenir.',boost:[2,3],color:'#7fa899'}];
export const hero=id=>HEROES.find(h=>h.id===id);
export function visibleLots(g){return g.pool.map((id,index)=>({index,id:index<=g.round||g.phase==='ready'?id:null}));}
export function shuffle(items,rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function newGame(names=['Oyuncu 1','Oyuncu 2'],mode='local',rng=Math.random){return {version:1,mode,players:names.map((name,i)=>({name:name.trim().slice(0,20)||`Oyuncu ${i+1}`,coins:20,team:[]})),pool:shuffle(HEROES,rng).slice(0,10).map(h=>h.id),round:0,turn:0,bid:0,leader:null,passes:0,phase:'auction',history:[],arena:'city',luck:12,plans:[null,null]};}
export function canBid(g,p,amount){return g.phase==='auction'&&p===g.turn&&p!==g.leader&&g.players[p].team.length<5&&Number.isInteger(amount)&&amount>g.bid&&amount<=g.players[p].coins;}
export function bid(g,amount){if(!canBid(g,g.turn,amount))return false;g.bid=amount;g.leader=g.turn;g.passes=0;g.turn=1-g.turn;return true;}
export function pass(g){if(g.phase!=='auction')return false;if(g.leader!==null){finishLot(g,g.leader);}else{g.passes++;if(g.passes>=2)finishLot(g,null);else g.turn=1-g.turn;}return true;}
function finishLot(g,winner){const id=g.pool[g.round];if(winner!==null){g.players[winner].coins-=g.bid;g.players[winner].team.push(id);}g.history.push({id,winner,price:winner===null?0:g.bid});g.round++;g.bid=0;g.leader=null;g.passes=0;g.turn=g.round%2;if(g.round>=10||g.players.every(p=>p.team.length===5)){g.phase='ready';for(let p=0;p<2;p++){if(!g.players[p].team.length){const used=g.players.flatMap(x=>x.team);const free=g.pool.find(id=>!used.includes(id));g.players[p].team.push(free);g.history.push({id:free,winner:p,price:0,reinforcement:true});}}}}
export function synergy(ids){const counts={};ids.forEach(id=>counts[hero(id).group]=(counts[hero(id).group]||0)+1);return Math.min(12,Object.values(counts).reduce((a,n)=>a+Math.max(0,n-1)*4,0));}
export function botDecision(g,rng=Math.random){const h=hero(g.pool[g.round]);const p=g.players[1];const remaining=Math.max(1,Math.min(5-p.team.length,10-g.round));const value=Math.max(2,Math.round(h.rating/15+(rng()-.5)*3));const max=Math.min(p.coins,Math.max(1,Math.round(p.coins/remaining)+2),value);return canBid(g,1,g.bid+1)&&g.bid<max?g.bid+1:null;}
export function createBattle(g,rng=Math.random){const arena=ARENAS.find(a=>a.id===g.arena)||ARENAS[0];const fighters=g.players.map((p,side)=>p.team.map(id=>{const placement=resolvedPlan(p.team,g.plans?.[side],hero).find(p=>p.id===id);const h=hero(id);const stats=h.stats.map((n,i)=>n*(arena.boost.includes(i)?1.1:1));const maxHp=Math.round(65+stats[3]*12);return {id,side,slot:placement.slot,role:placement.role,guardRound:-1,stats,hp:maxHp,maxHp,shield:0,weaken:false,actions:0,synergy:synergy(p.team)};}));return {fighters,strategy:g.plans?.length===2&&g.plans.every((p,i)=>validPlan(g.players[i].team,p)),arena:g.arena,links:g.players.map(p=>teamLinks(p.team).map(link=>({id:link.id,charge:0,uses:0}))),control:[0,1].map(()=>({energy:35,tactic:'balanced',turns:0,commandAt:-3,tacticAt:-2,overdrive:0,focus:null})),commands:[],round:0,queue:[],done:false,winner:null,events:[],rng,luck:Math.min(25,Math.max(0,g.luck))/100};}
export function linkStatus(b,side){
 return (b?.links[side]??[]).map(state=>{const link=TEAM_LINKS.find(l=>l.id===state.id);return {...link,...state,active:link.members.every(id=>b.fighters[side].some(f=>f.id===id&&f.hp>0))};});
}
export function battleStep(b){
 if(b.done)return null;
 const living=s=>b.fighters[s].filter(f=>f.hp>0);
 if(!b.queue.length){b.round++;b.queue=b.fighters.flat().filter(f=>f.hp>0).map(f=>({f,initiative:f.stats[2]+f.stats[1]*.15+b.rng()*2-(b.strategy&&zoneOf(f.slot).id==='high'&&!hero(f.id).flight?1:0)})).sort((a,c)=>c.initiative-a.initiative).map(x=>x.f);}
 let attacker=b.queue.shift();while(attacker&&attacker.hp<=0)attacker=b.queue.shift();if(!attacker)return battleStep(b);
 const opponents=living(1-attacker.side),randomTarget=opponents[Math.floor(b.rng()*opponents.length)];
 const control=b.control[attacker.side],defender=b.control[1-attacker.side],selection=selectTarget(b,attacker,opponents,randomTarget,control.focus,hero),target=selection.target;
 if(!target){finish();return null;}
 attacker.actions++;control.turns++;control.energy=Math.min(100,control.energy+8);defender.energy=Math.min(100,defender.energy+4);
 const special=attacker.actions%3===0,h=hero(attacker.id),crit=b.rng()<b.luck;
 const dodge=b.rng()<Math.min(.20,Math.min(.16,Math.max(.02,(target.stats[2]-attacker.stats[1])*.012+.04))+(defender.tactic==='guard'?.04:0));
 const variance=1+(b.rng()*2-1)*b.luck;
 const activeLinks=linkStatus(b,attacker.side).filter(l=>l.active&&l.members.includes(attacker.id));
 for(const link of activeLinks){const state=b.links[attacker.side].find(s=>s.id===link.id);const partner=b.fighters[attacker.side].find(f=>f.id===link.members.find(id=>id!==attacker.id));const nearby=b.strategy&&adjacent(attacker.slot,partner?.slot);state.steps=(state.steps||0)+1;state.charge=Math.min(LINK_CHARGE,state.charge+1+(nearby&&state.steps%2===0?1:0));}
 const readyLink=!dodge?activeLinks.find(link=>b.links[attacker.side].find(s=>s.id===link.id).charge===LINK_CHARGE):null;
 let combo=null;
 if(readyLink){const state=b.links[attacker.side].find(s=>s.id===readyLink.id);state.charge=0;state.uses++;combo={id:readyLink.id,name:readyLink.name,members:[...readyLink.members],partner:readyLink.members.find(id=>id!==attacker.id),color:readyLink.color,bonus:readyLink.effect.damage};}
 let raw=(attacker.stats[0]*1.5+attacker.stats[5]*1.15+attacker.stats[4]*.65+attacker.stats[1]*.4+7)*(1+attacker.synergy/100);
 raw*=control.tactic==='rush'?1.18:control.tactic==='guard'?.9:1;
 const overdrive=control.overdrive>0;if(overdrive){raw*=1.25;control.overdrive--;}
 if(attacker.id==='hulk')raw*=1+(1-attacker.hp/attacker.maxHp)*.3;
 if(attacker.weaken){raw*=.65;attacker.weaken=false;}
 if(b.strategy){raw*=attacker.role==='protect'?.85:attacker.role==='hunt'?.92:1;const zone=zoneOf(attacker.slot).id;raw*=zone==='cover'?.92:zone==='open'?1.08: h.combat==='ranged'?(h.flight?1.12:1.08):1;}
 const pierce=special&&h.ability==='pierce';
 let damage=dodge?0:Math.max(5,Math.round((raw-target.stats[3]*(pierce?.3:.9)*(defender.tactic==='guard'?1.25:defender.tactic==='rush'?.7:1))*variance*(crit?1.5:1)*(special?1.25:1)))+(combo?.bonus??0);
 const extras=[],strategy=[];let guard=null;
 if(b.strategy){
  const zone=zoneOf(target.slot).id;let modifier=zone==='cover'&&h.combat==='ranged'?.8:zone==='open'?1.08:1;
  if(selection.screened){modifier*=.8;strategy.push('Ön saf koruması −%20');}
  if(zone==='cover'&&h.combat==='ranged'&&!dodge)strategy.push('Siper −%20');
  if(selection.flank)strategy.push('Arka safa sızdı');
  if(selection.intercepted)strategy.push('Ön saf hedefi kesti');
  damage=Math.round(damage*modifier);
  const protector=living(target.side).find(f=>f!==target&&f.role==='protect'&&f.guardRound!==b.round&&adjacent(f.slot,target.slot));
  if(protector&&damage>0){const share=Math.floor(damage*.3),absorb=Math.min(protector.shield,share);protector.shield-=absorb;protector.hp=Math.max(0,protector.hp-(share-absorb));protector.guardRound=b.round;damage-=share;guard={id:protector.id,damage:share-absorb,absorbed:absorb};strategy.push(`${hero(protector.id).name} ${share} hasarı üstlendi`);}
 }
 const absorbed=Math.min(target.shield,damage);target.shield-=absorbed;damage-=absorbed;target.hp=Math.max(0,target.hp-damage);
 const splash=amount=>opponents.filter(f=>f!==target&&f.hp>0).forEach(f=>{const absorb=Math.min(amount,f.shield);f.shield-=absorb;f.hp=Math.max(0,f.hp-(amount-absorb));});
 if(special&&!dodge){
  if(h.ability==='heal'){const heal=Math.min(24,attacker.maxHp-attacker.hp);attacker.hp+=heal;extras.push(`${h.name} +${heal} can yeniledi`);}
  if(h.ability==='shield'){living(attacker.side).forEach(f=>f.shield=Math.min(60,f.shield+15));extras.push('Takıma +15 kalkan');}
  if(h.ability==='weaken'&&target.hp>0){target.weaken=true;extras.push('Hedefin sonraki saldırısı −%35');}
  if(h.ability==='aoe'){const spread=b.strategy?opponents.filter(f=>f!==target&&f.hp>0&&adjacent(f.slot,target.slot)):opponents.filter(f=>f!==target&&f.hp>0);const amount=Math.round(8+attacker.stats[5]);spread.forEach(f=>{const absorb=Math.min(amount,f.shield);f.shield-=absorb;f.hp=Math.max(0,f.hp-(amount-absorb));});extras.push(b.strategy?'Alan hasarı hedefin komşularına yayıldı':'Alan hasarı diğer rakiplere yayıldı');}
 }
 if(readyLink){
  const effect=readyLink.effect;
  if(effect.splash){splash(effect.splash);extras.push(`İkili hamle: diğer rakiplere ${effect.splash} alan hasarı`);}
  if(effect.shield){living(attacker.side).filter(f=>readyLink.members.includes(f.id)).forEach(f=>f.shield=Math.min(60,f.shield+effect.shield));extras.push(`İkiliye +${effect.shield} kalkan`);}
  if(effect.weaken&&target.hp>0){target.weaken=true;extras.push('İkili hamle: hedefin sonraki saldırısı −%35');}
 }
 const defeated=opponents.filter(f=>f.hp===0).map(f=>f.id);
 const event={round:b.round,attacker:attacker.id,side:attacker.side,target:target.id,damage,absorbed,crit:crit&&!dodge,dodge,special:special&&!dodge,skill:h.skill,overdrive,combo,guard,strategy,flank:selection.flank,intercepted:selection.intercepted,defeated,extras,knockout:target.hp===0};
 b.events.push(event);finish();return event;
 function finish(){const alive=b.fighters.map((_,s)=>living(s).length);if(alive.includes(0)){b.done=true;b.winner=alive[0]>0?0:alive[1]>0?1:null;}else if(b.round>=40&&!b.queue.length){const health=b.fighters.map(fs=>fs.reduce((a,f)=>a+f.hp,0)/fs.reduce((a,f)=>a+f.maxHp,0));b.done=true;b.winner=Math.abs(health[0]-health[1])<.00001?null:health[0]>health[1]?0:1;b.decision=true;}}
}

export const TACTICS=[{id:'balanced',name:'Dengeli',desc:'Standart saldırı ve savunma.'},{id:'rush',name:'Hücum',desc:'+%18 saldırı, −%30 savunma.'},{id:'guard',name:'Savunma',desc:'−%10 saldırı, +%25 savunma, +4 puan kaçış.'}];
export const COMMANDS=[{id:'overdrive',name:'Güç patlaması',cost:35,desc:'Sonraki 3 takım saldırısı +%25 hasar.',symbol:'↯'},{id:'barrier',name:'Takım kalkanı',cost:35,desc:'Yaşayan kahramanlara +22 kalkan (en fazla 60).',symbol:'◇'},{id:'rally',name:'İkinci nefes',cost:50,desc:'Yaşayan kahramanlara +20 can.',symbol:'✚'}];
export function setTactic(b,side,id){const c=b?.control[side];if(!c||b.done||!TACTICS.some(t=>t.id===id)||c.tactic===id||c.turns-c.tacticAt<2)return false;c.tactic=id;c.tacticAt=c.turns;return true;}
export function focusTarget(b,side,id){if(!b||b.done||![0,1].includes(side))return false;if(id!==null&&!b.fighters[1-side].some(f=>f.id===id&&f.hp>0))return false;b.control[side].focus=id;return true;}
export function canCommand(b,side,id){const c=b?.control[side],cmd=COMMANDS.find(x=>x.id===id);return !!(c&&cmd&&!b.done&&c.energy>=cmd.cost&&c.turns-c.commandAt>=3&&(id!=='overdrive'||!c.overdrive)&&b.fighters[side].some(f=>f.hp>0)&&(id!=='rally'||b.fighters[side].some(f=>f.hp>0&&f.hp<f.maxHp))&&(id!=='barrier'||b.fighters[side].some(f=>f.hp>0&&f.shield<60)));}
export function battleCommand(b,side,id){if(!canCommand(b,side,id))return null;const cmd=COMMANDS.find(x=>x.id===id),c=b.control[side];c.energy-=cmd.cost;c.commandAt=c.turns;const affected=b.fighters[side].filter(f=>f.hp>0);let amount=0;if(id==='overdrive')c.overdrive=3;if(id==='barrier')affected.forEach(f=>{const n=Math.min(22,60-f.shield);f.shield+=n;amount+=n;});if(id==='rally')affected.forEach(f=>{const n=Math.min(20,f.maxHp-f.hp);f.hp+=n;amount+=n;});const event={id,side,name:cmd.name,round:b.round,amount,index:b.commands.length};b.commands.push(event);return event;}
export function botBattleCommand(b,side=1){const fs=b.fighters[side],ratio=fs.reduce((n,f)=>n+f.hp,0)/fs.reduce((n,f)=>n+f.maxHp,0);for(const id of ratio<.55?['rally','barrier','overdrive']:['overdrive','barrier'])if(canCommand(b,side,id))return battleCommand(b,side,id);return null;}

export function upcomingTurns(b,limit=5){return b&&!b.done?b.queue.filter(f=>f.hp>0).slice(0,Math.max(0,limit)).map(f=>({id:f.id,side:f.side,special:(f.actions+1)%3===0})):[];}
